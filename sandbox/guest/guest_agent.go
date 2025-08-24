package main

import (
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"os/exec"
	"time"

	"github.com/mdlayher/vsock"
)

func main() {
	ln, err := vsock.Listen(8000, nil)
	if err != nil {
		log.Fatalf("vsock listen failed: %v", err)
	}
	defer ln.Close()
	log.Println("agent: listening on vsock:8000")

	for {
		c, err := ln.Accept()
		if err != nil {
			log.Printf("accept error: %v", err)
			continue
		}
		go handleConn(c)
	}
}

func handleConn(conn net.Conn) {
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(5 * time.Minute))

	code, err := readWithIdleTimeout(conn, 200*time.Millisecond, 2*time.Second)
	if err != nil {
		log.Printf("agent: read error: %v", err)
		fmt.Fprintf(conn, "[agent] read error: %v\n", err)
		return
	}
	log.Printf("agent: received %d bytes of code", len(code))
	if n := len(code); n > 0 {
		if n > 200 {
			n = 200
		}
		log.Printf("agent: code head: %q", string(code[:n]))
	}

	py := pickPython()
	if py == "" {
		fmt.Fprint(conn, "__NO_PYTHON__\n")
		runProbe(conn)
		return
	}
	log.Printf("agent: using interpreter %s", py)

	cmd := exec.Command(py, "-I", "-u", "-c", string(code))
	wireEnv(cmd)

	cmd.Stdout = conn
	cmd.Stderr = conn

	err = cmd.Run()
	if err != nil {
		fmt.Fprintf(conn, "[agent] process exit error: %v\n", err)
	}

}

func readWithIdleTimeout(r net.Conn, idle time.Duration, maxTotal time.Duration) ([]byte, error) {
	var buf []byte
	start := time.Now()
	tmp := make([]byte, 64<<10)

	for {
		if time.Since(start) > maxTotal {
			break
		}
		_ = r.SetReadDeadline(time.Now().Add(idle))
		n, err := r.Read(tmp)
		if n > 0 {
			buf = append(buf, tmp[:n]...)
			continue
		}
		if n == 0 && err != nil {
			ne, ok := err.(net.Error)
			if ok && ne.Timeout() {
				break
			}
			if err == io.EOF {
				break
			}
			return buf, err
		}
	}
	_ = r.SetReadDeadline(time.Time{})
	return buf, nil
}

func pickPython() string {
	candidates := []string{
		"/opt/python/bin/python3",
		"/opt/python/bin/python3.10",
		"/usr/local/bin/python3",
		"/usr/bin/python3",
	}
	for _, p := range candidates {
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p
		}
	}
	return ""
}

func wireEnv(cmd *exec.Cmd) {
	cmd.Env = append(os.Environ(),
		"PYTHONHOME=/opt/python",
		"PATH=/opt/python/bin:/usr/local/bin:/usr/bin:/bin",
		"LD_LIBRARY_PATH=/opt/python/lib",
		"PYTHONIOENCODING=UTF-8",
	)
}

func runProbe(conn net.Conn) {
	sh := "/bin/sh"
	if st, err := os.Stat(sh); err != nil || st.IsDir() {
		fmt.Fprintln(conn, "guest_agent error: no python and no /bin/sh available")
		return
	}
	log.Printf("agent: using probe shell: %s", sh)
	cmd := exec.Command(sh, "-lc", `
echo "[probe] /lib:"; ls -l /lib || true
echo "[probe] /opt/python/bin:"; ls -l /opt/python/bin || true
echo "[probe] /opt/python/lib:"; ls -l /opt/python/lib || true
echo "[probe] python3 --version:"; /opt/python/bin/python3 --version || true
`)
	wireEnv(cmd)
	cmd.Stdout = conn
	cmd.Stderr = conn
	_ = cmd.Run()
}
