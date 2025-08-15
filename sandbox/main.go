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
	"os/exec"
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
	sendChunk(req.JobID, "stdout", "VM started. (init=/bin/sh)\n")
	sendChunk(req.JobID, "exit", 0)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))

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
	time.Sleep(500 * time.Millisecond)

	client := &http.Client{
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				return net.Dial("unix", sockPath)
			},
		},
	}
	// Configure machine
	machineCfg := []byte(`{"vcpu_count":1,"mem_size_mib":256,"smt":false}`)
	req, err := http.NewRequest("PUT", "http://localhost/machine-config", bytes.NewReader(machineCfg))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	bootSrc := []byte(`{
  "kernel_image_path":"../artifacts/vmlinux.bin",
  "boot_args":"console=ttyS0 reboot=k panic=1 pci=off init=/bin/sh"
}`)
	req, err = http.NewRequest("PUT", "http://localhost/boot-source", bytes.NewReader(bootSrc))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err = client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("boot-source failed: %s: %s", resp.Status, string(b))
	}

	// Rootfs
	rootfs := []byte(`{
  "drive_id":"rootfs",
  "path_on_host":"../artifacts/rootfs.ext4",
  "is_root_device":true,
  "is_read_only":false
}`)
	req, err = http.NewRequest("PUT", "http://localhost/drives/rootfs", bytes.NewReader(rootfs))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err = client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("drives/rootfs failed: %s: %s", resp.Status, string(b))
	}

	// Start VM
	start := []byte(`{ "action_type": "InstanceStart" }`)
	req, err = http.NewRequest("PUT", "http://localhost/actions", bytes.NewReader(start))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err = client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("actions start failed: %s: %s", resp.Status, string(b))
	}

	fmt.Println("VM started for job:", jobId)
	return nil
}
func main() {
	http.HandleFunc("/run", runHandler)
	log.Println("Sandbox listening on :5000")
	log.Fatal(http.ListenAndServe(":5000", nil))

}
