from pathlib import Path
import subprocess, json, shutil

OUT = Path(__file__).resolve().parent
SRC = OUT.parent / 'demo-assets'
ASSETS = OUT / 'composition/assets/footage'
# All footage stays at 1x; no geometric crop, mirror or signer treatment.
CUTS = [
    ('signup', 'StorytellerSignup', 26, 8, True),
    ('upload-form', 'StorytellerSignup', 43, 18, False),
    ('caption', 'StorytellerSignup', 53, 17, False),
    ('upload-progress', 'StorytellerSignup', 85, 18, False),
    ('private-draft', 'StorytellerSignup', 103, 10, False),
    ('learner-account', 'learnerlogin', 10.5, 2, False),
    ('browse', 'learnerlogin', 13, 10, False),
    ('watch', 'learnerlogin', 26, 19, False),
    ('key-signs', 'learnerlogin', 46.5, 2.8, False),
    ('teacher-account', 'teacherbrowse', 17.4, 1, False),
    ('teacher-home', 'teacherbrowse', 98, 16, False),
]
for name, source, start, length, redact in CUTS:
    dest = OUT / 'clips' / (name + '.mp4')
    filters = ['fps=30', 'setsar=1']
    hold = {'learner-account': 6, 'teacher-account': 11}.get(name, 0)
    if hold:
        filters += [f'trim=duration={length}', 'setpts=PTS-STARTPTS', f'tpad=stop_mode=clone:stop_duration={hold}']
    if redact:
        # Credentials only. This screen contains no person. Strong pixelation
        # plus solid cover prevents recovery of email/password characters.
        filters += ['drawbox=x=18:y=32:w=350:h=250:color=0x203430:t=fill',
                    "drawtext=text='Demo credentials hidden':x=35:y=120:fontsize=21:fontcolor=white"]
    args = ['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(start),
            '-i',str(SRC / (source + '.mp4')),'-t',str(length+hold),
            '-vf',','.join(filters),'-an','-c:v','libx264','-threads','1',
            '-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)]
    subprocess.run(args, check=True)
    shutil.copy2(dest, ASSETS / dest.name)
(OUT/'clip-manifest.json').write_text(json.dumps([
    dict(clip=n+'.mp4', source=s+'.mp4', start=t, end=t+d,
         audio='omitted; silent UI or unverified source audio', credentials_redacted=r,
         hold_seconds={'learner-account':6,'teacher-account':11}.get(n,0))
    for n,s,t,d,r in CUTS],indent=2))
print('Prepared',len(CUTS),'clips at natural speed.')
