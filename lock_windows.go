//go:build windows

package main

// InstanceLock manages a file lock to prevent multiple instances
// On Windows, this is a stub implementation (NoteBeam is primarily for macOS)
type InstanceLock struct{}

// NewInstanceLock creates a new instance lock
func NewInstanceLock() *InstanceLock {
	return &InstanceLock{}
}

// Acquire tries to acquire the lock (stub: always succeeds on Windows)
func (l *InstanceLock) Acquire() error {
	return nil
}

// Release releases the lock (stub: no-op on Windows)
func (l *InstanceLock) Release() {
}
