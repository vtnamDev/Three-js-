# PELAGIC visual browser audit

This workflow opens the actual production URL in Chromium using a 390×844 mobile viewport with SwiftShader WebGL, waits for the hero, inspects HUD/canvas visibility, captures surface and mid-descent screenshots, and reports browser console/request errors.

The screenshots are uploaded as a GitHub Actions artifact. The audit reports only what the browser actually observed; it does not imply physical-device FPS validation.
