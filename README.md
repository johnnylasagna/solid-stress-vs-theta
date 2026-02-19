# Stress Transformation Visualizer

An interactive tool for exploring 2D stress transformations in solid mechanics. You can adjust the stress state of an element, rotate it to any angle, and immediately see how the stresses change — both on a Mohr's circle and as a σ/τ vs θ plot.

## What it does

Given a plane stress state (σx, σy, τxy), the app shows:

- **Mohr's Circle** — the classic graphical construction for stress transformation. Points on the circle represent the normal and shear stress on any rotated face. Principal stresses, max shear, and the current rotation angle are all labeled.
- **σ vs θ Graph** — plots σx′(θ) and τx′y′(θ) over a configurable angle range. Principal stress locations (where τ = 0) are marked automatically.
- **Element Orientation** — a live diagram of the rotated stress element with arrows showing the transformed stresses on each face.
- **Derived Values** — σ₁, σ₂, τmax, σavg, and the principal angles are computed and displayed in real time.

The stress transformation equations used are:

$$\sigma_{x'} = \frac{\sigma_x + \sigma_y}{2} + \frac{\sigma_x - \sigma_y}{2}\cos 2\theta + \tau_{xy}\sin 2\theta$$

$$\tau_{x'y'} = -\frac{\sigma_x - \sigma_y}{2}\sin 2\theta + \tau_{xy}\cos 2\theta$$

## Why it exists

Mohr's circle is one of those concepts that's much easier to understand visually than from a textbook derivation. This tool is meant to let you build intuition by playing with stress states and watching how the circle and curves respond in real time.

## Setup

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Usage

- **Sliders** — drag the σx, σy, and τxy sliders to set the stress state. You can also click the min/max labels to type in a custom range.
- **Presets** — buttons for common stress states (uniaxial, pure shear, biaxial, etc.) to quickly load a reference case.
- **Rotation angle** — the θ slider (or drag on the element diagram) rotates the stress element. The Mohr's circle point and stress values update live.
- **Tabs** — switch between the Mohr's Circle view and the σ vs θ graph.
- **Angle range** — on the graph tab, you can set the θ range shown on the plot.
- **Mohr's Circle toolbar** — toggle visibility of individual features (principal points, τmax, σavg line, grid, etc.) and zoom/pan the circle.
