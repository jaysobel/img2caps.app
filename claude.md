# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview
img2caps is a React app that helps keyboard enthusiasts design custom key cap sets. It generates Yuzu KeyCaps-compatible JSON outputs for easy design implementation.

## Commands
- `npm start`: Run the development server
- `npm test`: Run tests
- `npm test -- --testNamePattern="specific test name"`: Run a specific test
- `npm run build`: Build for production

## Code Guidelines
- Always use TypeScript (.tsx files, not .jsx)
- Use functional components with React hooks
- Define interfaces for props and state
- Use typed references (useRef<HTMLElement>)
- Use tailwindcss for styling
- Use async/await for asynchronous operations
- Handle loading states and errors explicitly
- Follow existing type definitions in src/types/
- Prioritize rapid iteration over backwards compatibility

## Project Phase
We are in a rapid prototyping phase. Prioritize functionality over extensive documentation. Do not leave excessive comments about functionality that has changed.