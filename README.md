# Multi-Tape Turing Machine Simulator

A professional academic-grade **3-Tape Deterministic Turing Machine simulator** built using vanilla **HTML, CSS, and JavaScript**. This project was developed as part of a **Theory of Computation** course to visually demonstrate the execution of classical algorithms on a multi-tape Turing Machine through an interactive interface.

## Features

### Built-in Algorithms

The simulator includes implementations of three classical multi-tape Turing Machine problems:

- **Palindrome Checker**
  - Determines whether an input string is a palindrome
  - Supports both even and odd length inputs
  - Uses coordinated pointer movement across tapes to compare symbols efficiently

- **String Copying**
  - Copies an input string from one tape to another
  - Uses a third tape to assist with positional tracking during execution

- **Binary Addition**
  - Performs right-to-left ripple-carry binary addition
  - Dynamically writes result bits onto the output tape
  - Simulates carry propagation step-by-step

### Simulation Capabilities

- Real-time visualization of **three independent tapes**
- Independent tape head movement for each tape
- Highlighted active cells during execution
- Accept / Reject state indication
- Step-by-step execution mode
- Automatic execution mode with adjustable speed
- Transition table logging for every computation step

### User Interface

- Clean academic light-theme interface
- Card-based responsive layout
- Visual tape head indicators
- Transition history tracking panel
- Designed for clarity and demonstration purposes

## Local Setup

This project uses only vanilla web technologies and does not require any installation or build tools.

Clone the repository:

```bash
git clone <your-repository-url>
   ```
2. Open `index.html` in your preferred web browser.

## Tech Stack

- **HTML5:** Semantic structure and layout.
- **CSS3:** Modern styling, flexbox/grid layouts, animations, and custom UI components (no external framework).
- **JavaScript (Vanilla):** State management, transition logic matrices, DOM manipulation, and visual updates.

## Architecture & Logic

The simulation uses an internal state object to track the current mode, step count, and tape status.

Each algorithm is implemented via a factory function that returns a `delta` (transition) function:
- `buildPalindromeTransitions(input)`
- `buildCopyTransitions(input)`
- `buildBinaryTransitions(a, b)`

These define the specific states (e.g., `q1`, `q_seek`, `q_add0`, `q_add1`), expected reads, and the corresponding outputs (writes, directional moves, next state).

The UI is actively synchronized with this state through standard DOM manipulation, allowing the `step()` function to accurately display the internal state of the 3-Tape Turing Machine algorithm logic on screen.
