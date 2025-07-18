# compare latest json with the one before
vimdiff <(git show $(git log -2 --format=%H -- web/json/qcm_ffvl.json | tail -1):web/json/qcm_ffvl.json | jq .) <(git show HEAD:web/json/qcm_ffvl.json | jq .)

