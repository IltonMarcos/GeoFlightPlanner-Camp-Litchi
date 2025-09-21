# **App Name**: GeoCSV Editor

## Core Features:

- CSV Import: Import point data from a CSV file, automatically mapping coordinate columns (latitude, longitude, altitude) and preserving other attributes.
- Map Display: Display imported points on a 2D map using MapLibre GL, with optional "light 3D" using altitude values where available.
- Point Selection: Select points individually, by drawing a polygon, or select all points.
- Point Editing: Edit point locations by dragging on the map or entering coordinates in a table. Includes options to move, duplicate, and delete points.
- Attribute-Aware Export: Export edited point data back to a CSV file, maintaining the original column order and names, and supporting both absolute and offset values.
- Action Tracking with Undo/Redo: Allows to revert any unwanted operation in the system with an unlimited stack of actions with full undo and redo capability.
- Smart Defaults using Generative AI: The app will remember and adapt to your common routines with time to make your operation easier. An AI tool runs in the background using logs and history, and then can auto-fill any values where needed.

## Style Guidelines:

- Primary color: Deep indigo (#3F51B5) for a professional and reliable feel.
- Background color: Very light gray (#F5F5F5), close in hue to indigo but highly desaturated, for a clean, uncluttered workspace.
- Accent color: Soft orange (#FFAB40), analogous to indigo in hue but differing in saturation and brightness, used for interactive elements and highlights.
- Body and headline font: 'PT Sans', a humanist sans-serif for modern readability.
- Simple, geometric icons to represent actions such as import, export, edit, and delete.
- Clean, tabular layout for attribute display and editing. Map view should dominate the screen.
- Subtle transitions and animations to provide feedback during point selection and editing.