import json
import base64
import sys
from io import BytesIO
import re
from bs4 import BeautifulSoup
import textwrap
import math

class Document:
    def __init__(self, format, data, template=None):
        self.format = format
        self.html = data['html']

        if template:
            self.path = "./resources/customTemplate" + format
            self.write_base64_to_file(template, self.path)
        else:
            self.path = "./resources/template" + format

    def process(self):
        self.html.replace('\n', '')

        soup = BeautifulSoup(self.html, 'html.parser')
        first_tag = soup.find()
        if first_tag and first_tag.name != 'h1':
            new_h1 = soup.new_tag('h1')
            new_h1.string = "[No Title]"
            soup.insert(0, new_h1)
        
        paragraphs = []
        title = None
        for element in soup.contents:
            if hasattr(element, 'name'):
                if element.name == 'h1':
                    if title:
                        self.write(title, paragraphs)
                        paragraphs = []
                    title = element.get_text()

                elif element.name == 'table':
                    paragraph = self.Paragraph(str(element), type='table')
                    paragraphs.append(paragraph)

                elif element.name == 'img' or (element.name == 'figure' and element.find('img')) or (element.name == 'p' and element.find('img')):
                    src = element.find('img')['src']
                    image = self.Paragraph(src, type='img')
                    paragraphs.append(image)

                elif element.name == 'ul':
                    for li in element.find_all('li'):
                        paragraph = self.Paragraph(str(li), type='p')
                        paragraphs.append(paragraph)
                else:
                    paragraph = self.Paragraph(str(element), type='p')
                    paragraphs.append(paragraph)

        if title:
            self.write(title, paragraphs)
            title = None

        document_io = BytesIO()
        self.document.save(document_io)
        document_io.seek(0)
        return base64.b64encode(document_io.read()).decode('utf-8')  

    def process3(self):
        for root in self.tree_data:
            if not 'children' in root:
                break

            sorted_children = sorted(root['children'], key=lambda child: child['order'])
            for (index, child) in enumerate(sorted_children):
                if child['parentNodeID']:
                    html_text = child['source']

                    soup = BeautifulSoup(html_text, 'html.parser')
                    paragraphs = []
                    block_elements = ['p', 'ul', 'ol', 'li', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'article', 'section', 'header', 'footer', 'figure', 'figcaption', 'nav']
                    line_break_elements = ['br']

                    if soup.find(block_elements + line_break_elements):
                        for element in soup.find_all(block_elements + line_break_elements):
                            if element.name in block_elements or element.name in line_break_elements:
                                content = ''.join([str(child) for child in element.contents]).strip()
                                content_non_html = element.get_text(separator='')
                                paragraphs.append(self.Paragraph(content,content_non_html))
                    else:
                        content = soup.get_text(separator="", strip=True)
                        paragraphs.append(self.Paragraph(content))
        
                    current_line_number = 16
                    text_frame = None
                    for paragraph in paragraphs:
                        #print(paragraph.content, paragraph.estimate)
                        if paragraph.estimate > 15 or current_line_number + paragraph.estimate > 15:
                            page = self.create_page()
                            if child['title']:
                                self.add_title(page, title = child['title'])
                            text_frame = page.shapes.add_textbox(self.page_size["x"], self.page_size["y"], self.page_size["width"], self.page_size["height"]).text_frame
                            text_frame.word_wrap = True
                            text_frame.clear()
                            current_line_number = 0

                        self.html_to_element(text_frame, paragraph.content)  
                        current_line_number += paragraph.estimate

        document_io = BytesIO()
        self.document.save(document_io)
        document_io.seek(0)
        return base64.b64encode(document_io.read()).decode('utf-8')      
        



    def process2(self):
        for root in self.tree_data:
            page = self.create_page()

            if 'title' in root['content']['source']:
                self.add_title(page, title = root['content']['source'].get('title'))

            def add_content(node, x, y, width, height):
                if 'children' in node and node['content']['contentType_contentTypeID'] == 'T001':
                    n = len(node['children'])
                    sorted_children = sorted(node['children'], key=lambda child: child['order'])
                    for (index, child) in enumerate(sorted_children):
                        if 'vertical' in node['content']['source'] and node['content']['source'].get('vertical') == 1:
                            add_content(child,
                                        x + index * (width / n),
                                        y,
                                        width / n, 
                                        height
                                        )
                        else:
                            add_content(child, 
                                        x, 
                                        y + index * (height / n), 
                                        width, 
                                        height / n
                                        )
                elif not 'children' in node:
                    if node['content']['contentType_contentTypeID'] == 'T002':
                        self.add_text(page, x, y, width, height, node['content']['source'])
                    elif node['content']['contentType_contentTypeID'] == 'T004':
                        self.add_image(page, x, y, width, height, node['content']['source'])

            add_content(root, self.page_size["x"], self.page_size["y"], self.page_size["width"], self.page_size["height"])
        
        # Save the document
        document_io = BytesIO()
        self.document.save(document_io)
        document_io.seek(0)
        return base64.b64encode(document_io.read()).decode('utf-8')  

    def create_page(self, title = None):
        raise NotImplementedError("Subclasses must implement this method")

    def add_text(self, text_frame, html_text):
        raise NotImplementedError("Subclasses must implement this method")
    
    def add_image(self, page, x, y, width, height, source):
        raise NotImplementedError("Subclasses must implement this method")
    
    def write(self, title, paragraphs):
        raise NotImplementedError("Subclasses must implement this method")

    def html_to_element(self, object, html):
        soup = BeautifulSoup(html, 'html.parser')
        if object.paragraphs[0] and object.paragraphs[0].text == '':
            p = object.paragraphs[0]
        else:
            p = object.add_paragraph()

        for element in soup.contents:
            if hasattr(element, 'name') and element.name:
                #print(element, element.name)
                if element.name == 'br' or element.name == 'p':
                    for child in element.contents:
                        run = p.add_run()
                        run.text = child.get_text()
                        if hasattr(child, 'name') and child.name:
                            if child.name == 'strong':
                                run.font.bold = True
                            if child.name == 'em':
                                run.font.italic = True
                            if child.name == 'a':
                                hlink = run.hyperlink
                                if hasattr(child, 'href'):
                                    hlink.address = child['href']
                                else:
                                    hlink.address = ''  

                elif element.name == 'ul':
                    p = object.add_paragraph()
                    for li in element.find_all('li'):
                        run = p.add_run()
                        run.text = li.get_text()
                        p.level = 1
                        p.style = 'List Bullet'
                        p = object.add_paragraph()

                elif element.name == 'li':
                    run = p.add_run()
                    run.text = element.get_text()
                    p.level = 1
                    p.style = 'List Bullet'

                else:
                    run = p.add_run()
                    run.text = element.get_text()

                p = object.add_paragraph()
            else:
                run = p.add_run()
                run.text = element.get_text()



    def html_to_element2(self, object, html):
        soup = BeautifulSoup(html, 'html.parser')

        first_paragraph = True

        # Add paragraphs and list items to the text frame
        for element in soup:
            if element.name == 'p':
                # Check if the paragraph is only &nbsp; or empty and add an empty line
                if element.get_text().strip() == '' or element.get_text().strip() == '\xa0':
                    if first_paragraph:
                        p = object.paragraphs[0]
                        p.text = ''
                        first_paragraph = False
                    else:
                        p = object.add_paragraph()
                        p.text = ''
                    continue

                if first_paragraph:
                    p = object.paragraphs[0]
                    first_paragraph = False
                else:
                    p = object.add_paragraph()
                
                if element.find('strong'):
                    p.text = element.get_text()
                    p.font.bold = True
                elif element.find('em'):
                    p.text = element.get_text()
                    p.font.italic = True
                else:
                    p.text = element.get_text()
                    
            elif element.name == 'ul':
                for li in element.find_all('li'):
                    p = object.add_paragraph()
                    p.text = li.get_text()
                    p.level = 1
            elif element.name == 'br':
                p = object.add_paragraph()
                p.text = ''
            else:
                p = object.add_paragraph()
                p.text = element.get_text()

    def _create_tree(self):
        for item in self.data:
            if item['parentNodeID'] == 'null':
                item['parentNodeID'] = None

        nodes = {item['entityID']: item for item in self.data}
        roots = []

        for item in self.data:
            parent_id = item['parentNodeID']
            if parent_id is None:
                roots.append(item)
            else:
                parent = nodes[parent_id]
                if 'children' not in parent:
                    parent['children'] = []
                parent['children'].append(item)
        
        return roots

    def _write_base64_to_file(b64_string, file_path):
        binary_data = base64.b64decode(b64_string)
        with open(file_path, 'wb') as file:
            file.write(binary_data)

    class Paragraph:
        def __init__(self, content, type="p", chars_per_line=90):
            self.content = content
            self.chars_per_line = chars_per_line
            self.type = type
            if self.type == "p":
                self.estimate = self._number_of_lines()
            elif self.type == "img":
                self.estimate = 7
            elif self.type == "table":
                self.estimate = 14

        def _number_of_lines(self):
            content_non_html = self._get_non_html()
            if content_non_html:
                wrapped_text = textwrap.wrap(content_non_html, width=self.chars_per_line)
            else:
                wrapped_text = textwrap.wrap(self.content, width=self.chars_per_line)
            return len(wrapped_text)
        
        def _get_non_html(self):
            soup = BeautifulSoup(self.content, 'html.parser')
            return soup.get_text()
        



