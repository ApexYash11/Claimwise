import pytesseract
from PIL import Image 
from io import BytesIO
from pdf2image import convert_from_bytes

" extracting text from file either PDF or Image using tesseract OCR"
def extract_text(files_bytes: bytes, file_type: str) -> str:
  if file_type.lower()== "pdf":
    # converting Pdf Pages to images 
    images = convert_from_bytes(files_bytes)
    text=""
    for img in images:
      text += pytesseract.image_to_string(img)+ "\n"
    return text.strip()
  else: # image( JPG, png)
    img = Image.open(BytesIO(files_bytes))
    return pytesseract.image_to_string(img).strip()

