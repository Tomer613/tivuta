import os
from PIL import Image

folder = 'frontend/public/images/partners'

# We want to process all images
for filename in os.listdir(folder):
    if not (filename.lower().endswith('.png') or filename.lower().endswith('.jpg') or filename.lower().endswith('.jpeg')):
        continue
        
    filepath = os.path.join(folder, filename)
    try:
        img = Image.open(filepath).convert("RGBA")
        datas = img.getdata()
        
        newData = []
        for item in datas:
            # If the pixel is close to white (R>240, G>240, B>240), make it transparent
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
                
        img.putdata(newData)
        
        # Always save as PNG to support transparency
        new_filename = os.path.splitext(filename)[0] + '.png'
        new_filepath = os.path.join(folder, new_filename)
        img.save(new_filepath, "PNG")
        
        # If the original was not a PNG (e.g. JPEG), remove the old file
        if filename.lower() != new_filename.lower():
            os.remove(filepath)
            print("Processed and converted: " + filename.encode('ascii', 'ignore').decode('ascii') + " -> " + new_filename.encode('ascii', 'ignore').decode('ascii'))
        else:
            print("Processed: " + filename.encode('ascii', 'ignore').decode('ascii'))
            
    except Exception as e:
        print("Error processing " + filename.encode('ascii', 'ignore').decode('ascii'))

print("Background removal complete.")
