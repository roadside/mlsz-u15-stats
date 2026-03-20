import re
import os
from typing import List


# Common regex patterns
CLEAN_PATTERNS = {
    'nbsp': re.compile(r'\xa0'),
    'footnotes': re.compile(r'【\d+†\s*'),
    'brackets': re.compile(r'】'),
    'headers': re.compile(r'^#+\s*'),
    'image': re.compile(r'Image:?', re.IGNORECASE),
    'minutes': re.compile(r'\d{1,3}\''),
    'whitespace': re.compile(r'\s+'),
    'emoji': re.compile(r'⚽')
}


def clean_text(text: str) -> str:
    """
    Unified text cleaning function for all scraper scripts.
    
    Args:
        text: Raw text to clean
        
    Returns:
        Cleaned text
    """
    if not text:
        return ""
    
    # Replace non-breaking spaces
    text = CLEAN_PATTERNS['nbsp'].sub(" ", text)
    
    # Remove footnotes and brackets
    text = CLEAN_PATTERNS['footnotes'].sub("", text)
    text = CLEAN_PATTERNS['brackets'].sub("", text)
    
    # Remove headers
    text = CLEAN_PATTERNS['headers'].sub("", text)
    
    # Remove image references
    text = CLEAN_PATTERNS['image'].sub("", text)
    
    # Remove emoji (specifically for goals)
    text = CLEAN_PATTERNS['emoji'].sub(" ", text)
    
    # Normalize whitespace
    text = CLEAN_PATTERNS['whitespace'].sub(" ", text)
    
    return text.strip()


def normalize_lines(text: str) -> List[str]:
    """
    Split text into lines and clean each line.
    
    Args:
        text: Multi-line text to process
        
    Returns:
        List of cleaned, non-empty lines
    """
    lines = []
    for raw in text.splitlines():
        line = clean_text(raw)
        if line:
            lines.append(line)
    return lines


def clean_player_name(text: str) -> str:
    """
    Clean player names, removing minute markers.
    
    Args:
        text: Player name with potential minute markers
        
    Returns:
        Cleaned player name
    """
    text = clean_text(text)
    # Remove minute markers like "5'"
    text = re.sub(r'\d{1,3}\'', "", text)
    return re.sub(r'\s+', " ", text).strip()


# Common file paths
def get_project_paths():
    """
    Get common project paths used by all scrapers.
    
    Returns:
        Dictionary with common paths
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    data_dir = os.path.join(project_root, "data")
    web_data_dir = os.path.join(project_root, "web", "data")
    
    return {
        'current_dir': current_dir,
        'project_root': project_root,
        'data_dir': data_dir,
        'web_data_dir': web_data_dir
    }


def ensure_directories():
    """
    Create necessary directories if they don't exist.
    """
    paths = get_project_paths()
    os.makedirs(paths['data_dir'], exist_ok=True)
    os.makedirs(paths['web_data_dir'], exist_ok=True)
