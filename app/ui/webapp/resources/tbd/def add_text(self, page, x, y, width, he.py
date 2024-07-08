def add_text(self, page, x, y, width, height, source):
        text_frame = page.shapes.add_textbox(x, y, width, height).text_frame
        text_frame.word_wrap = True
        
        # Clear any existing text
        text_frame.clear()

        # Parse the HTML input
        soup = BeautifulSoup(source, 'html.parser')

        first_paragraph = True

        # Add paragraphs and list items to the text frame
        for element in soup:
            if element.name == 'p':
                # Check if the paragraph is only &nbsp; or empty and add an empty line
                if element.get_text().strip() == '' or element.get_text().strip() == '\xa0':
                    if first_paragraph:
                        p = text_frame.paragraphs[0]
                        p.text = ''
                        first_paragraph = False
                    else:
                        p = text_frame.add_paragraph()
                        p.text = ''
                    continue

                if first_paragraph:
                    p = text_frame.paragraphs[0]
                    first_paragraph = False
                else:
                    p = text_frame.add_paragraph()
                
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
                    p = text_frame.add_paragraph()
                    p.text = li.get_text()
                    p.level = 1
            elif element.name == 'br':
                p = text_frame.add_paragraph()
                p.text = ''
            else:
                p = text_frame.add_paragraph()
                p.text = element.get_text()