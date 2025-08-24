package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type RunRequest struct {
	JobID    string `json:"jobId"`
	Language string `json:"language"`
	Source   string `json:"source"`
}
type Chunk struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

func runHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("[sandbox] /run hit")
	var req RunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	log.Println("[sandbox] JobID:", req.JobID, "Language:", req.Language)
	if err := startVM(req.JobID); err != nil {
		log.Printf("[sandbox] startVM failed: %v\n", err)
		sendChunk(req.JobID, "stderr", fmt.Sprintf("VM boot failed: %v\n", err))
		sendChunk(req.JobID, "exit", 1)
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("failed to start VM"))
		return
	}
	switch req.Language {
	case "py":
		out, err := runPythonInGuest(req.JobID, req.Source)
		if err != nil {
			sendChunk(req.JobID, "stderr", "exec error: "+err.Error()+"\n")
			sendChunk(req.JobID, "exit", 1)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		sendChunk(req.JobID, "stdout", out)
		sendChunk(req.JobID, "exit", 0)
	default:
		sendChunk(req.JobID, "stderr", "unsupported language: "+req.Language+"\n")
		sendChunk(req.JobID, "exit", 2)
		w.WriteHeader(http.StatusBadRequest)

	}
}

func sendChunk(jobId string, chunkType string, data any) {
	chunk, err := json.Marshal(Chunk{Type: chunkType, Data: data})
	if err != nil {
		log.Println("failed to marshal:", err)
		return
	}
	url := "http://localhost:4000/internal/jobs/" + jobId + "/chunk"
	log.Println("[sandbox] Sending chunk to", url, "payload:", string(chunk))
	resp, err := http.Post(url, "application/json", bytes.NewReader(chunk))
	if err != nil {
		log.Println("Failed to send chunk:", err)
		return
	}
	log.Println("[sandbox] Gateway responded with:", resp.Status)
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("gateway responded with %s", resp.Status)
	}
}

func startVM(jobId string) error {
	sockPath := fmt.Sprintf("/tmp/fc-%s.sock", jobId)

	_ = os.Remove(sockPath)

	cmd := exec.Command("firecracker", "--api-sock", sockPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("launch firecracker: %w", err)
	}

	if err := waitForUnixSock(sockPath, 3*time.Second); err != nil {
		return fmt.Errorf("firecracker API not ready: %w", err)
	}
	client := &http.Client{
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				return net.Dial("unix", sockPath)
			},
		},
	}
	//machine-config
	if err := putJSON(client, "http://localhost/machine-config",
		[]byte(`{"vcpu_count":1,"mem_size_mib":256,"smt":false}`)); err != nil {
		return err
	}

	//boot source
	kernelPath, err := mustAbs("../artifacts/vmlinux.bin")
	if err != nil {
		return fmt.Errorf("kernel path: %w", err)
	}
	bootSrc := fmt.Sprintf(`{"kernel_image_path":%q,"boot_args":"console=ttyS0 reboot=k panic=1 pci=off init=/init"}`, kernelPath)
	if err := putJSON(client, "http://localhost/boot-source", []byte(bootSrc)); err != nil {
		return err
	}

	//rootfs
	rootfsPath, err := mustAbs("../artifacts/rootfs.ext4")
	if err != nil {
		return fmt.Errorf("kernel path: %w", err)
	}
	rootfs := fmt.Sprintf(`{"drive_id":"rootfs","path_on_host":%q,"is_root_device":true,"is_read_only":false}`, rootfsPath)
	if err := putJSON(client, "http://localhost/drives/rootfs", []byte(rootfs)); err != nil {
		return err
	}
	//vsock
	_ = os.Remove(fmt.Sprintf("/tmp/vsock-%s.sock", jobId))
	if err := attachVsock(client, jobId); err != nil {
		return err
	}

	pyPath, err := mustAbs("../artifacts/python.ext4")
	if err != nil {
		return fmt.Errorf("python drive path: %w", err)
	}

	pyDrive := fmt.Sprintf(`{
  "drive_id":"python",
  "path_on_host":%q,
  "is_root_device":false,
  "is_read_only":true
}`, pyPath)

	if err := putJSON(client, "http://localhost/drives/python", []byte(pyDrive)); err != nil {
		return fmt.Errorf("attach python drive: %w", err)
	}

	//start instance
	if err := putJSON(client, "http://localhost/actions",
		[]byte(`{"action_type":"InstanceStart"}`)); err != nil {
		return err
	}

	log.Println("VM started for job:", jobId)
	return nil
}
func putJSON(client *http.Client, url string, payload []byte) error {
	req, err := http.NewRequest("PUT", url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("%s failed: %s: %s", url, resp.Status, string(b))
	}
	return nil
}

func mustAbs(p string) (string, error) {
	ap, err := filepath.Abs(p)
	if err != nil {
		return "", err
	}
	st, err := os.Stat(ap)
	if err != nil {
		return "", fmt.Errorf("%s not accessible: %w", ap, err)
	}
	if st.IsDir() {
		return "", fmt.Errorf("%s is a directory, expected file", ap)
	}
	return ap, nil
}

func runPythonInGuest(jobId string, code string) (string, error) {
	uds := fmt.Sprintf("/tmp/vsock-%s.sock", jobId)
	if err := waitForVsockUDS(uds, 3*time.Second); err != nil {
		return "", fmt.Errorf("vsock uds not ready: %w", err)
	}
	deadline := time.Now().Add(5 * time.Second)
retry:
	if time.Now().After(deadline) {
		return "", fmt.Errorf("handshake failed after retries")
	}

	c, err := net.Dial("unix", uds)
	if err != nil {
		time.Sleep(100 * time.Millisecond)
		goto retry
	}
	rd := bufio.NewReader(c)

	if _, err := c.Write([]byte("CONNECT 8000\n")); err != nil {
		_ = c.Close()
		time.Sleep(100 * time.Millisecond)
		goto retry
	}

	_ = c.SetReadDeadline(time.Now().Add(1 * time.Second))
	line, err := rd.ReadString('\n')
	if err != nil {
		_ = c.Close()
		time.Sleep(100 * time.Millisecond)
		goto retry
	}
	if !strings.HasPrefix(line, "OK ") {
		_ = c.Close()
		time.Sleep(100 * time.Millisecond)
		goto retry
	}

	if _, err := c.Write([]byte(code)); err != nil {
		_ = c.Close()
		return "", fmt.Errorf("write code: %w", err)
	}

	_ = c.SetReadDeadline(time.Now().Add(10 * time.Second))
	out, err := io.ReadAll(rd) // reuse same reader
	_ = c.Close()
	if ne, ok := err.(net.Error); ok && ne.Timeout() {
		return "", fmt.Errorf("guest agent didn’t respond on vsock:8000 (timeout)")
	}
	if err != nil {
		return "", fmt.Errorf("read output: %w", err)
	}
	return string(out), nil
}

func waitForUnixSock(path string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if _, err := os.Stat(path); err == nil {
			if conn, err := net.Dial("unix", path); err == nil {
				conn.Close()
				return nil
			}
		}
		time.Sleep(50 * time.Millisecond)
	}
	return fmt.Errorf("timeout waiting for %s", path)
}

func waitForVsockUDS(path string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if fi, err := os.Stat(path); err == nil && !fi.IsDir() {
			return nil
		}
		time.Sleep(50 * time.Millisecond)
	}
	return fmt.Errorf("timeout waiting for %s", path)
}

func attachVsock(client *http.Client, jobId string) error {
	uds := fmt.Sprintf("/tmp/vsock-%s.sock", jobId)
	bodyWithId := fmt.Sprintf(`{"vsock_id":"vsock0","guest_cid":3,"uds_path":%q}`, uds)
	bodyNoId := fmt.Sprintf(`{"guest_cid":3,"uds_path":%q}`, uds)

	if err := putJSON(client, "http://localhost/vsocks/vsock0", []byte(bodyNoId)); err == nil {
		return nil
	}

	if err := putJSON(client, "http://localhost/vsocks", []byte(bodyWithId)); err == nil {
		return nil
	}

	if err := putJSON(client, "http://localhost/vsock", []byte(bodyNoId)); err == nil {
		return nil
	}

	return fmt.Errorf("vsock setup failed on all known endpoints")
}

func main() {
	http.HandleFunc("/run", runHandler)
	log.Println("Sandbox listening on :5000")
	log.Fatal(http.ListenAndServe(":5000", nil))

}
