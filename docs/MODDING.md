# Modding

Milestone 0 does not implement mod loading.

The repository only prepares the content layout:

```text
public/content/vanilla/data/
public/content/vanilla/assets/
public/content/vanilla/licenses/
```

Future modding should be data and asset driven. Arbitrary executable JavaScript mods, `eval`,
and browser API access from mods are not allowed in v1.
