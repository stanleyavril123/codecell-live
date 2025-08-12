package main

import (
	"fmt"
	"time"
)

func worker(out chan<- string) {
	for i := 1; i <= 3; i++ {
		out <- fmt.Sprintf("event %d", i)
		time.Sleep(150 * time.Millisecond)
	}
	close(out)
}

func main() {
	ch := make(chan string)
	go worker(ch)

	for msg := range ch {
		fmt.Println("got:", msg)
	}

}
