//go:build !windows

package main

import (
	"fmt"
	"log/slog"
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
		_ = f.Close() // Ignore error on cleanup path
		return fmt.Errorf("another instance of NoteBeam is already running")
	}

	// Write PID to lock file for debugging
	if err := f.Truncate(0); err != nil {
		_ = f.Close()
		return fmt.Errorf("failed to truncate lock file: %w", err)
	}
	if _, err := f.Seek(0, 0); err != nil {
		_ = f.Close()
		return fmt.Errorf("failed to seek lock file: %w", err)
	}
	if _, err := fmt.Fprintf(f, "%d\n", os.Getpid()); err != nil {
		_ = f.Close()
		return fmt.Errorf("failed to write PID to lock file: %w", err)
	}

	l.lockFile = f
	return nil
}

// Release releases the lock
func (l *InstanceLock) Release() {
	if l.lockFile != nil {
		if err := syscall.Flock(int(l.lockFile.Fd()), syscall.LOCK_UN); err != nil {
			slog.Warn("failed to unlock file", "error", err)
		}
		if err := l.lockFile.Close(); err != nil {
			slog.Warn("failed to close lock file", "error", err)
		}
		if err := os.Remove(l.lockPath); err != nil {
			slog.Warn("failed to remove lock file", "error", err)
		}
		l.lockFile = nil
	}
}
