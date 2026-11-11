from pathlib import Path
import subprocess,json
OUT=Path(__file__).resolve().parent
state=OUT/'verification/posters.json'
done=json.loads(state.read_text()) if state.exists() else {}
for name,t in [('deaf-talks-highlights',40),('deaf-talks-demo',185)]:
    src=OUT/(name+'.mp4')
    if not src.exists() or name in done:continue
    poster=OUT/(name+'.jpg');dest=OUT/(name+'.with-poster.mp4')
    subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(t),'-i',str(src),'-frames:v','1','-q:v','2',str(poster)],check=True)
    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(src),'-i',str(poster),
                    '-filter_complex_threads','1','-filter_complex',"[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]",
                    '-map','[v]','-map','0:a:0','-c:v','libx264','-threads','1','-crf','18','-preset','fast',
                    '-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',str(dest)],check=True)
    dest.replace(src);done[name]={'poster_source_timestamp':t,'first_frame_only':True}
    state.write_text(json.dumps(done,indent=2));print('Poster baked:',name,flush=True)
