package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
)

type Chunk struct {
	Type string `json:"type"`
	Data string `json:"data"`
}

func main() {
	ch := Chunk{Type: "stdout", Data: "hello"}
	body, _ := json.Marshal(ch)

	req, _ := http.NewRequest("POST", "http://localhost:4000/internal/jobs/demo/chunk", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)

	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	log.Println("status: ", resp.Status)

}

