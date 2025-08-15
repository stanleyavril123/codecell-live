package main

import (
	"bufio"
	"context"
	"log"
	"os/exec"
	"time"
)

func main() {

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "bash", "-lc", `while true; do echo tick; sleep 0.5; done`)
	stdout, _ := cmd.StdoutPipe()
	_ = cmd.Start()

	go func() {
		sc := bufio.NewScanner(stdout)
		for sc.Scan() {
			log.Printf("stdout : %s ", sc.Text())
		}
	}()

	err := cmd.Wait()
	log.Println("exited with:", err)
}

