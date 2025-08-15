package main

import (
	"encoding/json"
	"fmt"
)

type Chunk struct {
	Type string `json:"type"`
	Data string `json:"data"`
}

func main() {
	c := Chunk{Type: "stdout", Data:"hello"}
	b, _ := json.Marshal(c)
	fmt.Println(string(b))
	
var d Chunk
	_ = json.Unmarshal(b, &d)
fmt.Printf("%v\n", d)
}
