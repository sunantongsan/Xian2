package com.sunantongsan.xian2;
import org.json.JSONObject;
import java.io.IOException;
final class UpdateManifest {
 static final long MAX_BYTES=64L*1024*1024;
 final String version,sha256,path;final long size;final int minApp;
 UpdateManifest(String json)throws Exception{
  JSONObject m=new JSONObject(json);
  if(!"cockro".equals(m.getString("game"))||m.getInt("engine")!=88)throw new IOException("แพตช์ไม่ตรงกับเกม");
  version=m.getString("version");versionParts(version);
  sha256=m.getString("sha256");size=m.getLong("size");path=m.getString("path");minApp=m.getInt("minAppVersionCode");
  if(!sha256.matches("[a-f0-9]{64}")||!path.equals("patches/"+sha256+".zip")||size<=0||size>MAX_BYTES||minApp<1)throw new IOException("ข้อมูลแพตช์ไม่ถูกต้อง");
 }
 static int[] versionParts(String version)throws IOException{
  if(version==null||!version.matches("[0-9]{1,4}\\.[0-9]{1,4}\\.[0-9]{1,4}"))throw new IOException("เลขรุ่นไม่ถูกต้อง");
  String[] parts=version.split("\\.");return new int[]{Integer.parseInt(parts[0]),Integer.parseInt(parts[1]),Integer.parseInt(parts[2])};
 }
 static int compare(String a,String b)throws IOException{int[] x=versionParts(a),y=versionParts(b);for(int i=0;i<3;i++)if(x[i]!=y[i])return Integer.compare(x[i],y[i]);return 0;}
}
