package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"
)

const backupRetentionDays = 7

// App struct
type App struct {
	ctx               context.Context
	notePath          string
	lastDailyBackup   string // Track the date of last daily backup (YYYY-MM-DD)
}

// NewApp creates a new App application struct
func NewApp() *App {
	homeDir, _ := os.UserHomeDir()
	notePath := filepath.Join(homeDir, "Documents", "NoteBeam", "index.md")
	return &App{
		notePath: notePath,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Ensure directory exists
	dir := filepath.Dir(a.notePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		slog.Error("failed to create directory", "dir", dir, "error", err)
	}
}

// LoadNote loads the note content from file
func (a *App) LoadNote() (string, error) {
	data, err := os.ReadFile(a.notePath)
	if err != nil {
		if os.IsNotExist(err) {
			// File doesn't exist yet, return empty string (not an error)
			return "", nil
		}
		return "", fmt.Errorf("failed to load note: %w", err)
	}
	return string(data), nil
}

// SaveNote saves the note content to file with backup
func (a *App) SaveNote(content string) error {
	// Create backup before saving
	if err := a.createBackup(); err != nil {
		slog.Warn("failed to create backup", "error", err)
		// Continue saving even if backup fails
	}

	return os.WriteFile(a.notePath, []byte(content), 0644)
}

// createBackup creates .bak file and daily backup
func (a *App) createBackup() error {
	// Check if original file exists
	if _, err := os.Stat(a.notePath); os.IsNotExist(err) {
		return nil // Nothing to backup
	}

	// Read current content
	data, err := os.ReadFile(a.notePath)
	if err != nil {
		return fmt.Errorf("failed to read file for backup: %w", err)
	}

	// Create .bak file (always)
	bakPath := a.notePath + ".bak"
	if err := os.WriteFile(bakPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write .bak file: %w", err)
	}

	// Create daily backup if not already done today
	today := time.Now().Format("2006-01-02")
	if a.lastDailyBackup != today {
		if err := a.createDailyBackup(data, today); err != nil {
			slog.Warn("failed to create daily backup", "error", err)
		} else {
			a.lastDailyBackup = today
			// Clean up old backups
			a.cleanOldBackups()
		}
	}

	return nil
}

// createDailyBackup creates a dated backup in the backups directory
func (a *App) createDailyBackup(data []byte, date string) error {
	backupsDir := filepath.Join(filepath.Dir(a.notePath), "backups")
	if err := os.MkdirAll(backupsDir, 0755); err != nil {
		return fmt.Errorf("failed to create backups directory: %w", err)
	}

	backupPath := filepath.Join(backupsDir, fmt.Sprintf("index.%s.md", date))
	if err := os.WriteFile(backupPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write daily backup: %w", err)
	}

	slog.Info("created daily backup", "path", backupPath)
	return nil
}

// cleanOldBackups removes backups older than retention period
func (a *App) cleanOldBackups() {
	backupsDir := filepath.Join(filepath.Dir(a.notePath), "backups")
	entries, err := os.ReadDir(backupsDir)
	if err != nil {
		return
	}

	cutoff := time.Now().AddDate(0, 0, -backupRetentionDays)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			path := filepath.Join(backupsDir, entry.Name())
			if err := os.Remove(path); err != nil {
				slog.Warn("failed to remove old backup", "path", path, "error", err)
			} else {
				slog.Info("removed old backup", "path", path)
			}
		}
	}
}

// SaveImage saves a base64-encoded image to the images directory
// Returns the relative path to the saved image (e.g., "images/20260116235959.png")
func (a *App) SaveImage(base64Data string) (string, error) {
	// Decode base64 data
	imageData, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	// Create images directory
	imagesDir := filepath.Join(filepath.Dir(a.notePath), "images")
	if err := os.MkdirAll(imagesDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create images directory: %w", err)
	}

	// Generate filename with timestamp
	filename := fmt.Sprintf("%s.png", time.Now().Format("20060102150405"))
	imagePath := filepath.Join(imagesDir, filename)

	// Save image file
	if err := os.WriteFile(imagePath, imageData, 0644); err != nil {
		return "", fmt.Errorf("failed to save image: %w", err)
	}

	return "images/" + filename, nil
}

// GetImageBase64 reads an image file and returns its base64-encoded content
func (a *App) GetImageBase64(relativePath string) (string, error) {
	imagePath := filepath.Join(filepath.Dir(a.notePath), relativePath)
	data, err := os.ReadFile(imagePath)
	if err != nil {
		return "", fmt.Errorf("failed to read image: %w", err)
	}
	return base64.StdEncoding.EncodeToString(data), nil
}
