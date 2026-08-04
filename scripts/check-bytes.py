# Check what bytes are actually in the file before 'frac' and 'times'
filepath = '/home/z/my-project/src/app/api/solve/route.ts'
with open(filepath, 'rb') as f:
    data = f.read()

for search in [b'frac', b'times', b'theta', b'sin\\{', b'neq']:
    idx = 0
    count = 0
    while True:
        idx = data.find(search, idx)
        if idx == -1:
            break
        before = data[idx-1] if idx > 0 else None
        before2 = data[idx-2] if idx > 1 else None
        desc = f'0x{before:02x}' if before is not None else 'N/A'
        desc2 = f'0x{before2:02x}' if before2 is not None else 'N/A'
        if count < 5:
            print(f'{search.decode()}: pos={idx}, byte_before={desc}, 2_before={desc2}')
        count += 1
        idx += len(search)
    print(f'  Total "{search.decode()}" occurrences: {count}')
    print()