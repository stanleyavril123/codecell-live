package main

import (
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
		break

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

	cmd := exec.Command("firecracker", "--api-sock", sockPath)
	if err := cmd.Start(); err != nil {
		return err
	}
	time.Sleep(500 * time.Millisecond) // change sleep later

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
	bootSrc := fmt.Sprintf(`{"kernel_image_path":%q,"boot_args":"console=ttyS0 reboot=k panic=1 pci=off init=/bin/sh"}`, kernelPath)
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
	uds := fmt.Sprintf("/tmp/vsock-%s.sock", jobId)
	payload := fmt.Sprintf(`{"guest_cid":3,"uds_path":%q}`, uds)
	if err := putJSON(client, "http://localhost/vsocks/vsock0", []byte(payload)); err != nil {
		return fmt.Errorf("vsock setup failed: %w", err)
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

func main() {
	http.HandleFunc("/run", runHandler)
	log.Println("Sandbox listening on :5000")
	log.Fatal(http.ListenAndServe(":5000", nil))

}
