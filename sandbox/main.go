package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
)

type RunRequest struct {
	JobID    string `json:"jobId"`
	Language string `json:"language"`
	Source   string `json:"source"`
}
type Chunk struct {
	Type string `json:"type"`
	Data any `json:"data"`
}

func runHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("[sandbox] /run hit")
	var req RunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	log.Println("[sandbox] JobID:", req.JobID, "Language:", req.Language)
	sendChunk(req.JobID, "stdout", "Hello from sandbox!\n")
	sendChunk(req.JobID, "exit", 0)
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

func main() {
	http.HandleFunc("/run", runHandler)
	log.Println("Sandbox listening on :5000")
	log.Fatal(http.ListenAndServe(":5000", nil))

}
