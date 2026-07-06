import shutil
import os

src = r"C:\Users\agent\.gemini\antigravity\brain\368384d4-a558-44a9-aceb-ad23dd9d7c5a\media__1783333197855.png"
dest = r"d:\AI Engineer Website\Thalha Portfolio\nutrix_logo.png"

shutil.copy2(src, dest)
print(f"Done. Copied to {dest}")
