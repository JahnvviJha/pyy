import sys
from PIL import Image

def remove_checkerboard(img_path, out_path):
    print(f"Processing {img_path}...")
    try:
        img = Image.open(img_path).convert("RGBA")
    except Exception as e:
        print(f"Failed to open {img_path}: {e}")
        return

    data = img.getdata()
    new_data = []
    
    # We will look for near-white and near-grey.
    # Usually AI checkerboards are approx (255,255,255) and (204,204,204) or (230,230,230)
    for item in data:
        r, g, b, a = item
        
        # If it's very bright (white/light grey) AND completely desaturated (r=g=b approx)
        if r > 180 and g > 180 and b > 180 and abs(r-g) < 15 and abs(r-b) < 15:
            # Make it transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(out_path, "PNG")
    print(f"Saved {out_path}")

if __name__ == "__main__":
    remove_checkerboard("assets/Gemini_Generated_Image_uysqrpuysqrpuysq.png", "assets/Gemini_Generated_Image_uysqrpuysqrpuysq_nobg.png")
    remove_checkerboard("assets/Gemini_Generated_Image_ef60hcef60hcef60 (1).png", "assets/Gemini_Generated_Image_ef60hcef60hcef60 (1)_nobg.png")
