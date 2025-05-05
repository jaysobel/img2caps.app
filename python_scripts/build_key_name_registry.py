#!/usr/bin/env python3
import json
import os
import sys
from collections import defaultdict

def build_key_name_registry(input_file, output_file):
    """
    Read the keyPositionRegistry JSON file and create a compressed version
    where key names (labels) map to keycodes
    """
    try:
        with open(input_file, 'r') as f:
            key_registry = json.load(f)
        
        # Create the new dictionary with key names as keys and keycodes as values
        name_registry = {}
        duplicate_check = defaultdict(list)
        
        for keycode, data in key_registry.items():
            key_name = data.get('label', '')
            if key_name:
                # Check for duplicates (e.g., multiple shift keys)
                duplicate_check[key_name].append(keycode)
                
        # Handle duplicates by creating lists of keycodes where needed
        for key_name, keycodes in duplicate_check.items():
            if len(keycodes) == 1:
                name_registry[key_name] = keycodes[0]
            else:
                name_registry[key_name] = keycodes
        
        # Write the new JSON file
        with open(output_file, 'w') as f:
            json.dump(name_registry, f, indent=2)
        
        print(f"Created key name registry at {output_file}")
        print(f"Mapped {len(name_registry)} key names")
        
        # Report duplicates
        duplicates = {k: v for k, v in duplicate_check.items() if len(v) > 1}
        if duplicates:
            print(f"Found {len(duplicates)} duplicate key names:")
            for name, codes in duplicates.items():
                print(f"  {name}: {len(codes)} instances")
    except Exception as e:
        print(f"Error creating key name registry: {e}")
        return False
    
    return True

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.realpath(__file__))
    project_dir = os.path.dirname(script_dir)
    
    input_file = os.path.join(project_dir, "src", "data", "keyPositionRegistry.json")
    output_file = os.path.join(project_dir, "src", "data", "keyNameRegistry.json")
    
    # Allow overriding input/output files via command line
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    success = build_key_name_registry(input_file, output_file)
    sys.exit(0 if success else 1) 