package main

import (
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok\n"))
	})

	log.Println("listening on -> :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))

}
