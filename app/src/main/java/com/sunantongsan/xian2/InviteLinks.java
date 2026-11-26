package com.sunantongsan.xian2;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.RemoteException;
import android.webkit.JavascriptInterface;
import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import java.util.Locale;

final class InviteLinks {
    private final Activity activity;
    private final SharedPreferences prefs;
    private final Runnable changed;
    private InstallReferrerClient client;

    InviteLinks(Activity activity, Runnable changed) {
        this.activity = activity;
        this.changed = changed;
        prefs = activity.getSharedPreferences("invite-links", Activity.MODE_PRIVATE);
    }

    private static String code(String raw) {
        return raw != null && raw.matches("[A-Za-z0-9]{4,16}") ? raw.toUpperCase(Locale.ROOT) : "";
    }

    void receive(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data == null || !"cockronetwork".equals(data.getScheme()) || !"invite".equals(data.getHost())) return;
        String value = code(data.getQueryParameter("ref"));
        if (!value.isEmpty()) {
            prefs.edit().putString("pending", value).putBoolean("readInstall", true).apply();
            changed.run();
        }
    }

    void readInstall() {
        if (prefs.getBoolean("readInstall", false) || client != null) return;
        client = InstallReferrerClient.newBuilder(activity).build();
        try {
            client.startConnection(new InstallReferrerStateListener() {
                @Override public void onInstallReferrerSetupFinished(int result) {
                    if (client == null) return;
                    try {
                        if (result == InstallReferrerClient.InstallReferrerResponse.OK && !prefs.getBoolean("readInstall", false)) {
                            String query = client.getInstallReferrer().getInstallReferrer();
                            String value = code(Uri.parse("https://localhost/?" + query).getQueryParameter("ref"));
                            prefs.edit().putString("pending", value).putBoolean("readInstall", true).apply();
                            changed.run();
                        }
                    } catch (RemoteException | RuntimeException ignored) {
                        // Manual entry remains available when Play Store cannot provide attribution.
                    } finally { close(); }
                }
                @Override public void onInstallReferrerServiceDisconnected() { close(); }
            });
        } catch (RuntimeException ignored) { close(); }
    }

    void close() {
        InstallReferrerClient current = client;
        client = null;
        if (current != null) current.endConnection();
    }

    @JavascriptInterface public String getCode() { return prefs.getString("pending", ""); }
    @JavascriptInterface public void clearCode() {
        prefs.edit().remove("pending").putBoolean("readInstall", true).apply();
    }
    @JavascriptInterface public void share(String raw) {
        String value = code(raw);
        if (value.isEmpty()) return;
        activity.runOnUiThread(() -> {
            Intent intent = new Intent(Intent.ACTION_SEND).setType("text/plain")
                .putExtra(Intent.EXTRA_TEXT, "COCKRO MAN\nhttps://cockro-game-updates.vercel.app/play/invite.html?ref=" + value);
            activity.startActivity(Intent.createChooser(intent, null));
        });
    }
}
