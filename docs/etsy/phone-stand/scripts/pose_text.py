"""Put the Bambu-made name (text_shape) onto the generator's standing/folded preview poses, for renders.
python3 -I pose_text.py <print.3mf> <bambu_project.3mf> <pose.3mf> <out.3mf>"""
import re, sys, zipfile
import numpy as np

def mesh_objects(text):
    out = {}
    for m in re.finditer(r'<object id="(\d+)"([^>]*)>(.*?)</object>', text, re.S):
        attrs, body = m.group(2), m.group(3)
        if '<mesh>' not in body: continue
        name = re.search(r'name="([^"]*)"', attrs)
        v = np.array([[float(a) for a in x] for x in re.findall(r'<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"', body)])
        t = np.array([[int(a) for a in x] for x in re.findall(r'<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"', body)])
        out[m.group(1)] = (name.group(1) if name else None, v, t)
    return out

def by_name(objs, n):
    return next(o for o in objs.values() if o[0] == n)

printf, bambu, pose, outp = sys.argv[1:5]
P = by_name(mesh_objects(zipfile.ZipFile(printf).read('3D/3dmodel.model').decode()), 'BODY')[1]
zp = zipfile.ZipFile(pose); pose_xml = zp.read('3D/3dmodel.model').decode()
Q = by_name(mesh_objects(pose_xml), 'BODY')[1]
assert P.shape == Q.shape, (P.shape, Q.shape)
pc, qc = P.mean(0), Q.mean(0)
U, _, Vt = np.linalg.svd((P - pc).T @ (Q - qc))
d = np.sign(np.linalg.det(Vt.T @ U.T))
R = Vt.T @ np.diag([1, 1, d]) @ U.T
t = qc - R @ pc
print('fit error mm', np.abs((R @ P.T).T + t - Q).max())

zb = zipfile.ZipFile(bambu)
ob = mesh_objects(zb.read('3D/Objects/object_1.model').decode())
main = zb.read('3D/3dmodel.model').decode()
comps = {m.group(1): np.array([float(x) for x in m.group(2).split()]) for m in re.finditer(r'objectid="(\d+)"[^>]*transform="([^"]+)"', main)}
ids = sorted(ob, key=int)
body_b, text_b = ob[ids[0]], ob[ids[1]]
assert body_b[1].shape == P.shape
off = body_b[1][0] - P[0]
assert np.abs(body_b[1] - P - off).max() < 1e-3
c = comps[ids[1]]
Mt = c[:9].reshape(3, 3); ct = c[9:]
T = (text_b[1] @ Mt) + ct - off  # row-vector convention of 3MF
TV = (R @ T.T).T + t
verts = ''.join(f'<vertex x="{x:.5f}" y="{y:.5f}" z="{z:.5f}"/>' for x, y, z in TV)
tris = ''.join(f'<triangle v1="{a}" v2="{b}" v3="{c_}"/>' for a, b, c_ in text_b[2])
obj = f'<object id="900" type="model" name="TEXT" pid="3" pindex="0"><mesh><vertices>{verts}</vertices><triangles>{tris}</triangles></mesh></object>'
pose_xml = re.sub(r'(<object id="(\d+)" type="model" name="[^"]*"><components>)', obj + r'\1', pose_xml, count=1)
pose_xml = pose_xml.replace('</components>', '<component objectid="900"/></components>', 1)
if 'colorgroup id="3"' not in pose_xml:
    pose_xml = pose_xml.replace('<object id=', '<m:colorgroup id="3"><m:color color="#F4F1EAFF"/></m:colorgroup><object id=', 1)
# Turn the whole scene so the desk is 'down' on screen and the name side faces the camera
# (the renderer looks along -Z with +Y up).
u = np.array([0, 0, 1.0]); n = R @ np.array([0, 0, 1.0])
if '--flat' in sys.argv:  # folded: lie on the desk, name toward the camera, long axis horizontal
    u = R @ np.array([0, 1.0, 0]) * (-1 if '--flip' in sys.argv else 1)
b = n - u * (n @ u); b /= np.linalg.norm(b); cx = np.cross(u, b); M = np.array([cx, u, b])
def rot(m):
    v = np.array([float(m.group(i)) for i in (1, 2, 3)]) @ M.T
    return f'<vertex x="{v[0]:.5f}" y="{v[1]:.5f}" z="{v[2]:.5f}"/>'
pose_xml = re.sub(r'<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/>', rot, pose_xml)
ms = zp.read('Metadata/model_settings.config').decode().replace('</object>', '<part id="900" subtype="normal_part"><metadata key="name" value="TEXT"/><metadata key="extruder" value="3"/></part></object>', 1)
with zipfile.ZipFile(outp, 'w', zipfile.ZIP_DEFLATED) as zo:
    for n in zp.namelist():
        data = pose_xml if n == '3D/3dmodel.model' else ms if n == 'Metadata/model_settings.config' else zp.read(n)
        zo.writestr(n, data)
print('wrote', outp)
