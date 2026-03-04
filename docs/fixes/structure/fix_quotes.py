#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Исправление лишних кавычек в атрибутах data-mega-menu"""

import os
import re

files_to_fix = [
    'partners/index.html',
    'operators/index.html',
    'government/index.html',
    'developers/index.html',
    'contacts/index.html',
    'business/tv/office/index.html',
    'business/tv/iptv/index.html',
    'business/tv/index.html',
    'business/telephony/vpbx/index.html',
    'business/telephony/mobile/index.html',
    'business/telephony/ip/index.html',
    'business/telephony/fixed/index.html',
    'business/telephony/index.html',
    'business/security/video-surveillance/index.html',
    'business/security/alarm/index.html',
    'business/security/access-control/index.html',
    'business/security/index.html',
    'business/internet/office/index.html',
    'business/internet/dedicated/index.html',
    'business/cloud/vps/index.html',
    'business/cloud/services/index.html',
    'business/cloud/storage/index.html',
    'business/cloud/index.html'
]

fixed = 0
for file_path in files_to_fix:
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if 'data-mega-menu="aboutMenu""' in content:
                content = content.replace('data-mega-menu="aboutMenu""', 'data-mega-menu="aboutMenu"')
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                fixed += 1
                print(f"✓ Исправлен: {file_path}")
        except Exception as e:
            print(f"✗ Ошибка в {file_path}: {e}")

print(f"\nИсправлено файлов: {fixed}")

