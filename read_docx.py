import zipfile, xml.etree.ElementTree as ET, sys

def extract_text(filename):
    try:
        z = zipfile.ZipFile(filename)
        xml_content = z.read('word/document.xml')
        root = ET.fromstring(xml_content)
        
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        text = []
        for p in root.findall('.//w:p', ns):
            p_text = []
            for t in p.findall('.//w:t', ns):
                if t.text:
                    p_text.append(t.text)
            if p_text:
                text.append(''.join(p_text))
            else:
                text.append('')
        return '\n'.join(text)
    except Exception as e:
        return f"Error reading {filename}: {e}"

print("=== Neuroadapt Feature Ticket List V1.docx ===")
print(extract_text("Neuroadapt Feature Ticket List V1.docx"))
print("\n=== NeuroAdapt_Frontend_Spec.docx ===")
print(extract_text("NeuroAdapt_Frontend_Spec.docx"))
print("\n=== NeuroAdapt_PRD_v1.docx ===")
print(extract_text("NeuroAdapt_PRD_v1.docx"))
print("\n=== NeuroAdapt_Security_Access_Document.docx ===")
print(extract_text("NeuroAdapt_Security_Access_Document.docx"))
print("\n=== NeuroAdapt_TAD_v1.docx ===")
print(extract_text("NeuroAdapt_TAD_v1.docx"))
