from pathlib import Path
import subprocess, json

OUT=Path(__file__).resolve().parent
V=OUT/'verification'
def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True)
RESULTS={}
for name,expected,times in [
    ('deaf-talks-highlights',70,[0,2,10,16,24,28,35,40,49,56,64,69]),
    ('deaf-talks-demo',295,[0,10,24,37,53,64,77,95,113,126,138,152,163,172,185,200,208,219,231,249,263,275,283,291]),
]:
    p=OUT/(name+'.mp4')
    if not p.exists():continue
    d=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]).stdout)
    (V/(name+'-ffprobe.json')).write_text(json.dumps(d,indent=2))
    video=next(s for s in d['streams'] if s['codec_type']=='video')
    audio=next(s for s in d['streams'] if s['codec_type']=='audio')
    dur=float(d['format']['duration'])
    checks=dict(duration_seconds=dur,width=video['width'],height=video['height'],
                fps=video['avg_frame_rate'],video_codec=video['codec_name'],
                audio_codec=audio['codec_name'],audio_channels=audio['channels'],
                byte_size=p.stat().st_size,frame_count=video.get('nb_frames'))
    assert abs(dur-expected)<0.1,(name,dur)
    assert dur<=330 and (expected!=70 or 60<=dur<=75)
    assert (video['width'],video['height'])==(1920,1080)
    assert video['avg_frame_rate']=='30/1'
    assert video['codec_name']=='h264' and audio['codec_name']=='aac'
    folder=V/name;folder.mkdir(exist_ok=True)
    for i,t in enumerate(times):
        run(['ffmpeg','-loglevel','error','-y','-ss',str(t),'-i',str(p),'-frames:v','1',str(folder/f'frame-{i:02d}-{t}s.png')])
    run(['ffmpeg','-loglevel','error','-y','-framerate','1','-pattern_type','glob','-i',str(folder/'frame-*.png'),
         '-vf',f'scale=640:360,tile=4x{(len(times)+3)//4}', '-frames:v','1',str(folder/'contact-sheet.jpg')])
    levels=run(['ffmpeg','-hide_banner','-i',str(p),'-vn','-af','volumedetect','-f','null','-'])
    (folder/'audio-levels.log').write_text(levels.stderr)
    checks['sampled_timestamps']=times
    RESULTS[name]=checks
    print(name,json.dumps(checks))
(V/'results.json').write_text(json.dumps(RESULTS,indent=2))
