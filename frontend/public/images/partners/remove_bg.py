import os
from rembg import remove
from PIL import Image

# Define the folder containing the logos
input_folder = 'partners'
output_folder = 'partners_no_bg'

# Create the output directory if it doesn't exist
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

# List of files provided in the request
files = [
    "zara.png", "אור החיים.png", "אושר עד.png", "אפי קפיטל.png", "אפריל.png",
    "בגיר.png", "בנק פאגי.png", "גלי.png", "הדר דימול.png", "הלו תימן.png",
    "המנגנים.png", "המשביר לצרכן.png", "הצורפים.png", "יידישקייט.png",
    "ישראייר.png", "כלל.png", "כתר הרימון.png", "לניאדו.png", "מאפיית נחמה.png",
    "מגה ספורט.png", "מכבי.png", "מכללות.png", "מסילה.png", "משפחה מנויים.png",
    "מתנס חוגים.png", "נדרים פלוס.png", "נופש 2.png", "סולתם.png", "סופר פארם.png",
    "ספארי.png", "עוז קרמיקה.png", "פאות.png", "פיצה האט.png", "קידישיק.png",
    "קייטרינג.png", "קפה רימון.png", "רולדין.png", "רייסדור.png",
    "רמי לוי תקשורת.png", "רמי לוי.png", "שבת בוקינג.png", "שילב.png",
    "שלמה סיקסט.png", "שמלות כלה.png", "תיירות.png"
]

for file_name in files:
    input_path = os.path.join(input_folder, file_name)
    output_path = os.path.join(output_folder, file_name)
    
    if os.path.exists(input_path):
        try:
            # Open the image
            with open(input_path, 'rb') as i:
                input_image = i.read()
                # Remove the background
                output_image = remove(input_image)
                # Save the result
                with open(output_path, 'wb') as o:
                    o.write(output_image)
            print(f"Processed: {file_name}")
        except Exception as e:
            print(f"Error processing {file_name}: {e}")
    else:
        print(f"File not found: {input_path}")

print("Background removal complete.")