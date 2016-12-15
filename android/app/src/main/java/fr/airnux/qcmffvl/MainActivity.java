package fr.airnux.qcmffvl;

import android.content.Intent;
import android.net.Uri;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends AppCompatActivity {
    private WebView mWebView;
    private String ua;
    private String QcmUrl = "file:///android_asset/web/index.html";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        mWebView = (WebView) findViewById(R.id.webView);

        ua = mWebView.getSettings().getUserAgentString();
        // This is used within the web app to determine if we are the Android App
        mWebView.getSettings().setUserAgentString(ua + " (QCMFFVL Android App)");
        mWebView.getSettings().setJavaScriptEnabled(true);
        // Allow for local storage
        mWebView.getSettings().setDomStorageEnabled(true);
        // Allow for local storage to be persistent across app updates
        mWebView.getSettings().setDatabaseEnabled(true);

        mWebView.loadUrl(QcmUrl);

        mWebView.setWebViewClient(new WebViewClient() {
            // Using a deprecated version to use the simpler "url"
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Make use of mailto:
                if (url.startsWith("mailto:")) {
                    Intent i = new Intent(Intent.ACTION_SENDTO, Uri.parse(url));
                    startActivity(i);
                }
                // Open URLs in a browser instead of us
                else if (url.startsWith("http://") || url.startsWith("https://")) {
                    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(i);
                } else {
                    return false;
                }
                return true;
            }

            // remove actionBar and progressBar when webView is ready
            @Override
            public void onPageFinished(WebView view, String url) {
                findViewById(R.id.webView).setVisibility(View.VISIBLE);
                findViewById(R.id.progressBar).setVisibility(View.GONE);
            }

        });
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            switch (keyCode) {
                case KeyEvent.KEYCODE_BACK:
                    if (mWebView.canGoBack()) {
                        mWebView.goBack();
                    } else {
                        finish();
                    }
                    return true;
            }

        }
        return super.onKeyDown(keyCode, event);
    }

}
