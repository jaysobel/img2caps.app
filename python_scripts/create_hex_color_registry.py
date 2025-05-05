#!/usr/bin/env python3
import json
import os
import sys

def rgb_to_hex(rgb):
    """Convert an RGB list to a hex string (without # prefix)"""
    return '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2])

def create_hex_color_registry(input_file, output_file):
    """
    Read the color registry JSON file and create a new version with 
    hex color codes as keys and color names as values
    """
    try:
        with open(input_file, 'r') as f:
            color_registry = json.load(f)
        
        # Create the new dictionary with hex colors as keys
        hex_registry = {}
        for color_code, data in color_registry.items():
            rgb = data.get('rgb', [])
            if len(rgb) == 3:
                hex_code = rgb_to_hex(rgb)
                hex_registry[hex_code] = color_code
        
        # Write the new JSON file
        with open(output_file, 'w') as f:
            json.dump(hex_registry, f, indent=2)
        
        print(f"Created hex color registry at {output_file}")
        print(f"Converted {len(hex_registry)} colors")
    except Exception as e:
        print(f"Error creating hex color registry: {e}")
        return False
    
    return True

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.realpath(__file__))
    project_dir = os.path.dirname(script_dir)
    
    input_file = os.path.join(project_dir, "src", "data", "colorRegistry.json")
    output_file = os.path.join(project_dir, "src", "data", "hexColorRegistry.json")
    
    # Allow overriding input/output files via command line
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    success = create_hex_color_registry(input_file, output_file)
    sys.exit(0 if success else 1) 