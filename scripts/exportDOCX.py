import base64
import sys
import json
from docx import Document
from docx.shared import Inches

if __name__ == "__main__":
    # Read JSON data from stdin
    input_data = sys.stdin.read()
    try:
        document = Document()
        data = json.loads(input_data)
        path = "./resources/template.pptx"
        template = data['template']
        if template and template != 'null' and template != 'undefined':
            path = "./resources/template2.pptx"
            write_base64_to_file(template, path)

        entityData = json.loads(data['entityData'])
        #automationData = json.loads(data['automationData'])['value']
        tree = createTreeStructure(entityData)
        process_data2(tree, path)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}", file=sys.stderr)