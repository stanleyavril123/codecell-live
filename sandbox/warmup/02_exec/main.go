package main

import (
	"bufio"
	"log"
	"os/exec"
)

func main() {
	cmd := exec.Command("bash", "-lc", `for i in {1..3}; do echo "line $i"; sleep 0.2; done`)
	stdout, _ := cmd.StdoutPipe()
	if err := cmd.Start(); err != nil {
		log.Fatal(err)
	}
	sc := bufio.NewScanner(stdout)
	for sc.Scan() {
		log.Printf("stdout: %s", sc.Text())
	}
	if err := cmd.Wait(); err != nil {
		log.Fatal(err)
	}
}
