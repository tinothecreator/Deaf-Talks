from pathlib import Path
import json, html, shutil

OUT=Path(__file__).resolve().parent
COMP=OUT/'composition'
def scene(duration, chapter, title, body, caption, clip=None, credit='', extra=''):
    return dict(duration=duration,chapter=chapter,title=title,body=body,caption=caption,clip=clip,credit=credit,extra=extra)

MAIN=[
scene(12,'DEAF-TALKS · SIGNSTORIES','Deaf storytellers\nshould lead.','Stories to watch. Signs to learn.','A home for South African Sign Language stories, shared with care.'),
scene(18,'01 / THE PROBLEM','Learning starts\nwith people.','SASL learning material is scarce.\nStories need clear credit and consent.','The project addresses access to SASL stories and control over how they are shared.'),
scene(14,'02 / THE IDEA','Learn SASL\nthrough stories.','Deaf storytellers share short stories.\nLearners watch, read captions and explore signs.','Deaf-Talks · working product name: SignStories · deaf-talks.vercel.app'),
scene(16,'THREE ROLES','Storyteller.\nLearner. Teacher.','Storytellers share. Learners explore.\nTeacher accounts are assigned manually.','Sign-up offers Learner and Storyteller. Teacher promotion is managed by the team.'),
scene(8,'03 / STORYTELLER · SIGN-UP','Choose your role.','The recording selects Storyteller.\nDemo credentials are concealed.','Real screen recording · demo account · credentials redacted','signup'),
scene(18,'STORYTELLER · UPLOAD','Start with\na private draft.','Add a title and English caption.\nKeep the story under 60 seconds and 50 MiB.','MP4, WebM or MOV · the upload begins privately','upload-form',credit='Upload account: Tino · credit shown in app: Tino'),
scene(17,'STORYTELLER · ENGLISH CAPTION','Meaning stays\nvisible.','The storyteller writes the English caption.\nIt stays with the story during playback.','Visible caption: “Hello, how are you. I respect you and I support you.”','caption',credit='Demo upload by Tino · credit: Tino'),
scene(18,'STORYTELLER · PROGRESS','A clear upload\nprogress bar.','The file uploads directly to private storage.\nProgress is visible while the page stays open.','The selected demo video is 25.4 MB; progress reaches 100%.','upload-progress',credit='Demo upload by Tino · credit: Tino'),
scene(10,'STORYTELLER · SAVED','Saved privately.','Only the owner can view this draft.\nUploading is separate from publishing.','The recording confirms: “Your story is saved as a private draft. Only you can view it.”','private-draft',credit='Demo upload by Tino · credit: Tino'),
scene(14,'STORYTELLER · DOCUMENTED FEATURE','Tag 3–5\nkey signs.','Each tag has a label, meaning and timestamp.\nLearners can return to that moment.','Tagging is implemented in the repo; this step is explained because it was not recorded.',extra='REPO-VERIFIED EXPLANATION · NOT A RECORDED INTERACTION'),
scene(14,'STORYTELLER · DOCUMENTED FEATURE','Consent.\nUsage. Credit.','Set the permitted use and credit line.\nConfirm consent before publishing.','Publication requires consent, nonprivate usage, a caption, credit and 3–5 valid signs.',extra='REPO-VERIFIED EXPLANATION · NOT A RECORDED INTERACTION'),
scene(8,'04 / LEARNER · ACCOUNT','A learner\nsigns in.','The account view confirms the Learner role.\nBrowse stories starts the viewing flow.','Login entry is omitted to keep account details private.','learner-account'),
scene(10,'LEARNER · BROWSE','Choose a story.','Published stories show the title, caption\nand storyteller credit.','Real demo account footage · published stories at /stories','browse',credit='Visible demo story: Tindo · credit: Tindo\nOther demo card: Kakashi · credit: Kakashi'),
scene(19,'LEARNER · WATCH','Watch with\nEnglish captions.','“Hello, my name is T I N O T E N D A, I am\nlearning sign language. It’s nice to meet you.”','Story caption copied from the app; no new translation of the signing has been added.','watch',credit='Storyteller: gohan · credit: Tinothecreator\nDemo story: Learning sign language'),
scene(8,'LEARNER · KEY SIGNS','Find a moment.','My name · 0:02\nLearning · 0:12\nNice to meet you · 0:18','Recorded sign list; the final frame is held for reading. Practice is a roadmap feature.','key-signs',credit='Storyteller: gohan · credit: Tinothecreator'),
scene(9,'LEARNER · DOCUMENTED BEHAVIOUR','Tap a sign.\nReturn to its time.','The player seeks to the tag’s timestamp\nand starts playback.','Timestamp navigation is verified in the repo; a completed seek is not shown in this recording.',extra='REPO-VERIFIED EXPLANATION · NOT A RECORDED INTERACTION'),
scene(12,'05 / TEACHER · TODAY','A manually\nassigned role.','The demo account is identified as Teacher.\nAll signed-in roles can browse stories.','Teacher account view is held for reading. Review submission is excluded from this walkthrough.','teacher-account',credit='Demo teacher account: piccalo'),
scene(16,'TEACHER · BROWSING','Stories across\nroles.','The teacher account returns to Home\nand sees the latest stories.','Today’s walkthrough shows account access and browsing. Human feedback is listed under what’s next.','teacher-home',credit='Demo story: Tindo · credit: Tindo\nOther demo card: Kakashi · credit: Kakashi'),
scene(14,'06 / TRUST · OWNERSHIP','Credit stays\nwith the story.','Storyteller name + credit line + usage terms.\nWithdraw to return a story to draft and private.','Withdrawal hides the story from others and prevents new playback links.',extra='OWNERSHIP CONTROLS · VERIFIED IN THE REPO'),
scene(14,'TRUST · ACCESS','Permission\nbefore playback.','Row-level security checks consent and usage.\nPrivate files use five-minute playback links.','An already issued link may work until expiry. No download button; playback cannot prevent copying.',extra='PRIVATE STORAGE · SHORT-LIVED ACCESS · NO DOWNLOAD ACTION'),
scene(10,'07 / BUILT WITH','Next.js.\nSupabase. Vercel.','TypeScript + Tailwind CSS\nBuilt with Codex for the OpenAI × Andela hackathon.','Text-only AI belongs in the roadmap. People judge signing.'),
scene(8,'WHAT’S NEXT · NOT LIVE IN THIS DEMO','Practice. Feedback.\nAI-assisted captions.','Practice recordings and human teacher feedback.\nText-only AI drafts with storyteller approval.','No AI recognition, generation, grading or translation of sign language from video.'),
scene(8,'DEAF-TALKS · SIGNSTORIES','Stories to watch.\nSigns to learn.','deaf-talks.vercel.app\ngithub.com/tinothecreator/Deaf-Talks','OpenAI × Andela hackathon · built with Codex',extra='Music: Sascha Ende, ende.app (CC BY 4.0) · Vol. 12 · looped and faded'),
]
assert sum(s['duration'] for s in MAIN)==295
HIGHLIGHTS=[
scene(8,'DEAF-TALKS · SIGNSTORIES','Deaf storytellers\nshould lead.','Learn South African Sign Language\nthrough stories, with credit and consent.','OpenAI × Andela hackathon · working product name: SignStories'),
scene(14,'STORYTELLER · CAPTION','Start with\nthe storyteller.','Add a story title and English caption.\nUploads start as private drafts.','Real demo account footage · upload limit: 60 seconds, 50 MiB','caption',credit='Demo upload: Tino · credit: Tino'),
scene(12,'STORYTELLER · UPLOAD','Private first.\nPublish with consent.','Visible progress during upload.\nConsent, usage and credit control publication.','Publishing controls are verified in the repo; the recording shows upload.','upload-progress',credit='Demo upload: Tino · credit: Tino'),
scene(19,'LEARNER · WATCH','Stories to watch.\nSigns to learn.','“Hello, my name is T I N O T E N D A, I am\nlearning sign language. It’s nice to meet you.”','English caption copied from the app · five-minute playback links','watch',credit='Storyteller: gohan · credit: Tinothecreator'),
scene(7,'TRUST · BY DESIGN','Credit. Consent.\nControl.','Private storage. Row-level security.\nNo download button. Withdraw at any time.','Already issued playback links may remain valid until their five-minute expiry.'),
scene(10,'DEAF-TALKS · SIGNSTORIES','Try SignStories.','deaf-talks.vercel.app\ngithub.com/tinothecreator/Deaf-Talks','Next: practice, human feedback and approved text-only AI drafts.',extra='Music: Sascha Ende, ende.app (CC BY 4.0) · Vol. 12 · excerpt and fade'),
]
assert sum(s['duration'] for s in HIGHLIGHTS)==70

CSS='''*{box-sizing:border-box;margin:0} #root{position:absolute;inset:0;font-family:Inter,sans-serif;color:#203430} .ground{position:absolute;inset:0;background:#f7f7f2}.brand{position:absolute;left:196px;top:91px;font-size:30px;font-weight:700;color:#155e54}.rule{position:absolute;left:196px;top:146px;width:1528px;height:3px;background:#81908a}.chapter{position:absolute;left:196px;top:192px;font-size:28px;font-weight:700;letter-spacing:2px;color:#155e54}.title{position:absolute;left:196px;top:270px;width:1450px;font-size:86px;line-height:1.07;font-weight:700;letter-spacing:-3px;white-space:pre-line}.body{position:absolute;left:196px;top:505px;width:1470px;font-size:38px;line-height:1.5;white-space:pre-line}.credit{position:absolute;left:196px;top:741px;width:1020px;font-size:30px;line-height:1.4;white-space:pre-line;color:#203430}.extra{position:absolute;left:196px;top:761px;width:1500px;font-size:28px;line-height:1.5;color:#52635e}.phone{position:absolute;left:1300px;top:172px;width:374px;height:804px;border:12px solid #203430;border-radius:34px;background:#203430;box-shadow:0 14px 24px #20343024}.phone-label{position:absolute;left:1100px;top:91px;width:400px;font-size:28px;color:#52635e}.footage{position:absolute;left:1312px;top:184px;width:350px;height:780px;object-fit:contain;background:#f7f7f2;z-index:3}.with-video .title{width:1040px;font-size:76px}.with-video .body{width:1050px;font-size:35px}.with-video .credit{top:751px;width:1030px}.with-video .extra{width:1050px}.marker{position:absolute;left:196px;top:857px;width:100px;height:7px;background:#155e54}.number{position:absolute;right:196px;top:91px;font-size:28px;color:#52635e}'''
# Captions use the clear left lane when footage occupies the right lane.
CAPCSS='''.cap{position:absolute;left:196px;top:904px;width:1528px;min-height:60px;padding:14px 22px;border-radius:12px;background:#203430;color:#ffffff;font-family:Inter,sans-serif;font-size:30px;line-height:1.35}.cap.video-cap{width:1050px;top:876px;font-size:30px}'''
esc=html.escape
def build(scenes,entry,prefix):
    total=sum(s['duration'] for s in scenes); hosts=[]; captions=[]; time=0; manifest=[]
    for i,s in enumerate(scenes):
        sid=f'{prefix}-{i:02d}'; d=s['duration']; video=bool(s['clip']);
        text=f'<div class="ground"></div><div class="brand">Deaf-Talks / SignStories</div><div class="rule"></div><div class="number">{i+1:02d} / {len(scenes):02d}</div><div class="chapter">{esc(s["chapter"])}</div><h1 class="title">{esc(s["title"])}</h1><p class="body">{esc(s["body"])}</p><p class="credit">{esc(s["credit"])}</p><p class="extra">{esc(s["extra"])}</p><div class="marker"></div>'
        if video:
            text+=f'<div class="phone"></div><div class="phone-label">REAL DEMO FOOTAGE · 1×</div><video id="{sid}-video" class="clip footage" data-start="0" data-duration="{d}" data-track-index="2" src="assets/footage/{s["clip"]}.mp4" muted playsinline></video>'
        anim='' if i==0 else 'tl.fromTo(".title",{opacity:0},{opacity:1,duration:.35,ease:"power2.out"},.12);'
        # Natural reading holds take precedence over beat-sync for this walkthrough.
        script=f'const tl=gsap.timeline({{paused:true}});{anim}tl.fromTo(".marker",{{scaleX:0,transformOrigin:"left"}},{{scaleX:1,duration:.56,ease:"power3.out"}},0);window.__timelines["{sid}"]=tl;'
        scene_css=CSS.split('.with-video')[0]+'.number{position:absolute;right:196px;top:91px;font-size:28px;color:#52635e}'+(CSS[CSS.index('.with-video'):].replace('.with-video','#root') if video else '')
        (COMP/f'compositions/{sid}.html').write_text(f'<template><style>{scene_css}</style><div id="root" class="{"with-video" if video else "card"}" data-composition-id="{sid}" data-width="1920" data-height="1080" data-duration="{d}" data-hold>{text}</div><script>{script}</script></template>')
        hosts.append(f'<div id="{sid}" class="clip" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{time}" data-duration="{d}" data-track-index="0" data-track-kind="graphics"></div>')
        captions.append(f'<div id="{sid}-caption" class="clip cap {"video-cap" if video else ""}" data-start="{time}" data-duration="{d}" data-track-index="4">{esc(s["caption"])}</div>')
        manifest.append(dict(start=time,end=time+d,**s));time+=d
    capid=prefix+'-captions'
    (COMP/f'compositions/{capid}.html').write_text(f'<template><style>#root{{position:absolute;inset:0}}{CAPCSS}</style><div id="root" data-composition-id="{capid}" data-duration="{total}" data-width="1920" data-height="1080">'+''.join(captions)+f'</div><script>window.__timelines["{capid}"]=gsap.timeline({{paused:true}});</script></template>')
    hosts.append(f'<div id="{capid}" class="clip" data-composition-id="{capid}" data-composition-src="compositions/{capid}.html" data-start="0" data-duration="{total}" data-track-index="4" data-track-kind="captions" style="z-index:20"></div>')
    music=[]
    for j,start in enumerate(range(0,total,116)):
        dur=min(116,total-start)
        music.append(f'<audio id="{prefix}-music-{j}" class="clip" src="assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3" data-start="{start}" data-duration="{dur}" data-track-index="10" data-volume="0.18" data-fade-in="1" data-fade-out="2"></audio>')
    variables=json.dumps([dict(id='color-ground',type='color',label='Background',default='#f7f7f2'),dict(id='color-ink',type='color',label='Ink',default='#203430'),dict(id='color-accent',type='color',label='Brand',default='#155e54')])
    root=f'''<!doctype html><html lang="en" data-composition-variables='{variables}'><head><meta charset="utf-8"><title>Deaf-Talks — {prefix}</title><script src="assets/runtime/gsap.min.js"></script><style>*{{box-sizing:border-box}}html,body{{margin:0;width:1920px;height:1080px;overflow:hidden;background:#f7f7f2}}#root{{position:absolute;inset:0}} </style></head><body><div id="root" data-composition-id="{prefix}" data-start="0" data-duration="{total}" data-width="1920" data-height="1080" data-fps="30">{''.join(hosts+music)}</div><script>window.__timelines=window.__timelines||{{}};window.__timelines["{prefix}"]=gsap.timeline({{paused:true}});</script></body></html>'''
    (OUT/entry if entry=='main-entry.html' else COMP/entry).write_text(root)
    (OUT/f'{prefix}-timeline.json').write_text(json.dumps(manifest,indent=2))
    def stamp(t):
        ms=round(t*1000);return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'
    lines=[]
    for i,s in enumerate(manifest):
        # The authored visual narration is the caption source, never inferred signing.
        txt=s['caption']
        if s.get('clip')=='watch':txt=s['body']+'\n'+txt
        if s['credit']:txt+='\n'+s['credit']
        lines.append(f'{len(lines)+1}\n{stamp(s["start"])} --> {stamp(s["end"])}\n{txt}\n')
    (OUT/('captions.srt' if prefix=='main' else 'highlights-captions.srt')).write_text('\n'.join(lines))
    return manifest

if __name__=='__main__':
    build(MAIN,'main-entry.html','main');build(HIGHLIGHTS,'index.html','highlights')
    print('Built 295s main and 70s highlights compositions; highlights is the active entry.')
