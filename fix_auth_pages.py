import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Fix hero headline
    content = re.sub(
        r'<h1 className="[^"]*text-4xl lg:text-5xl font-bold[^"]*">',
        '<h1 className="font-display text-4xl lg:text-[48px] font-semibold text-primary leading-[1.1] mb-6 tracking-tight">',
        content
    )
    
    # 2. Fix stat blocks
    content = re.sub(
        r'<div className="text-3xl font-bold text-primary mb-1">([^<]+)</div>\s*<div className="text-sm text-muted font-medium">([^<]+)</div>',
        r'<div className="text-[32px] font-medium text-brand mb-1 leading-none">\1</div>\n              <div className="text-sm text-secondary">\2</div>',
        content
    )

    # 3. Fix CTA button
    content = re.sub(
        r'<button\s+type="submit"[^>]+className="[^"]+bg-brand[^"]+"[^>]*>',
        '<button type="submit" disabled={loading} className="btn-primary w-full py-3">',
        content
    )

    # 4. Remove blur blobs (optional but good to clean up if needed)
    # The spec doesn't explicitly mention removing blur blobs but says "replace gradient theme"
    
    with open(filepath, 'w') as f:
        f.write(content)

process_file('dashboard/src/pages/Login.jsx')
process_file('dashboard/src/pages/Register.jsx')
