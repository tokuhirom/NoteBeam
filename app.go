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

// App struct
type App struct {
	ctx      context.Context
	notePath string
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

// SaveNote saves the note content to file
func (a *App) SaveNote(content string) error {
	return os.WriteFile(a.notePath, []byte(content), 0644)
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
