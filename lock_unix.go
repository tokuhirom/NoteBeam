//go:build !windows

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"syscall"
)

// InstanceLock manages a file lock to prevent multiple instances
type InstanceLock struct {
	lockFile *os.File
	lockPath string
}

// NewInstanceLock creates a new instance lock
func NewInstanceLock() *InstanceLock {
	dataDir := getDataDir()
	lockPath := filepath.Join(dataDir, "NoteBeam", ".lock")
	return &InstanceLock{
		lockPath: lockPath,
	}
}

// Acquire tries to acquire the lock
// Returns nil if successful, error if another instance is running
func (l *InstanceLock) Acquire() error {
	// Ensure directory exists
	dir := filepath.Dir(l.lockPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create lock directory: %w", err)
	}

	// Open or create the lock file
	f, err := os.OpenFile(l.lockPath, os.O_CREATE|os.O_RDWR, 0644)
	if err != nil {
		return fmt.Errorf("failed to open lock file: %w", err)
	}

	// Try to acquire exclusive lock (non-blocking)
	err = syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
	if err != nil {
		f.Close()
		return fmt.Errorf("another instance of NoteBeam is already running")
	}

	// Write PID to lock file for debugging
	f.Truncate(0)
	f.Seek(0, 0)
	fmt.Fprintf(f, "%d\n", os.Getpid())

	l.lockFile = f
	return nil
}

// Release releases the lock
func (l *InstanceLock) Release() {
	if l.lockFile != nil {
		syscall.Flock(int(l.lockFile.Fd()), syscall.LOCK_UN)
		l.lockFile.Close()
		os.Remove(l.lockPath)
		l.lockFile = nil
	}
}
