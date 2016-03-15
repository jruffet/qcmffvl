'use strict';

/* Services */


angular.module('qcmffvl.services', [])

.value('version', '1.3')

.factory('API', function($http){
    return {
        generateQCM: function(array, QCMID) {
            var API = this;
            // we want to have 10 numbers tops to define the QCM ID,
            // so 2^33, which is 2^32 for the seed, and 1 bit to
            // define if we shall advance in the PRNG
            var seed, surseed;

            // 0 to 2^3x
            var max32 = Math.pow(2,32) -1;
            var max33 = Math.pow(2,33) -1;

            // generate from a known QCM ID
            if (QCMID) {
                // TODO: handle
                if (API.verifyChecksumQCM(QCMID) == -1) {
                    return -1;
                }
                QCMID = API.extractIDQCM(QCMID);
                seed = QCMID % max32;
                surseed = Math.floor(QCMID / max32);
                // console.debug(seed);
                // console.debug(surseed);
            } else {
                // generate random value between 0 and 2^32 - 1
                seed = Math.floor(Math.random() * (max32 + 1));
                // generate random value beween 0 and 1
                surseed = Math.floor(Math.random() * (1+1));
            }

            var mt = new MersenneTwister(seed);
            if (surseed) {
                // skip an arbitrary 1000 numbers in the PRNG
                for (var i=0; i<1000; i++) {
                    mt.random();
                }
            }

            var t, i;
            var m = array.length;
            // While there are elements to shuffle...
            while (m) {
                // Pick a remaining element...
                i = Math.floor(mt.random() * m--);

                // And swap it with the current element.
                t = array[m];
                array[m] = array[i];
                array[i] = t;
            }
            API.untickAnswers(array);
            // return QCM ID
            return API.computeIDQCM(seed + max32 * surseed);
        },
        tickAnswers: function(array) {
            var m = array.length;
            for (var i=0; i<array.length; i++) {
                for (var j=0; j<array[i].ans.length; j++) {
                    if (array[i].ans[j].pts >= 0) {
                        array[i].ans[j].checked = true;
                    }
                }
            }
        },
        untickAnswers: function(array) {
            var m = array.length;
            for (var i=0; i<array.length; i++) {
                for (var j=0; j<array[i].ans.length; j++) {
                    delete(array[i].ans[j].checked);
                }
            }
        },
        computeIDQCM: function(num) {
            var API = this;
            return API.formatID(num, API.getChecksumQCM(num));
        },
        // returns :
        // checksum if none given
        // -1 if the one given is bogus
        checksum: function(num, nbits, ck) {
            var pbits = [];
            var b2num = num.toString(2);
            var b2numlen = b2num.length;
            var step = Math.floor(b2numlen / nbits);
            var remaining = b2numlen % nbits;
            // console.log("%s : %s %s %s", num, b2numlen, nbits, step);
            var block, csum;
            // compute parity bits for each block
            for (var i=0; i<nbits; i++) {
                // optimise blocks so that every block has the same size +- 1 bit
                if (remaining-- > 0) {
                    block = b2num.substr(i*step, step +1);
                } else {
                    block = b2num.substr(i*step, step);
                }
                // console.debug("block (%s) : %s", remaining, block);
                pbits.push(parseInt(block,2)%2);
            }
            csum = parseInt(pbits.join(""), 2);
            if (ck && ck != csum) {
                return -1
            }
            return csum;
        },
        // nbits   : number of parity bits
        verifyChecksum: function(ID, nbits, nbchars) {
            var API = this;
            var myid = API.unformatID(ID, nbchars);
            // console.debug(myid);
            return API.checksum(parseInt(myid.ID,10), nbits, parseInt(myid.ck,10));
        },
        getChecksumQCM: function(num) {
            var API = this;
            // we have a space of 100, we can fit 2^6 : 6 parity bits
            return API.checksum(num, 6);
        },
        verifyChecksumQCM: function(ID) {
            var API = this;
            return API.verifyChecksum(ID, 6, 2);
        },
        pad: function(num, size) {
            return ('00000000000000000000000' + num).substr(-size);
        },
        formatID: function(num, checksum) {
            var API = this;
            // prepend "0"s so that our number is of length 10
            var str = API.pad(num, 10);
            return API.pad(checksum,2) + str;
        },
        // nbchars : number of parity chars at the beginning of ID
        unformatID: function(ID, nbchars) {
            var ck = ID.substr(0,nbchars);
            var num = ID.substr(nbchars);
            return { ck: parseInt(ck),
                     ID: parseInt(num) };
        },
        extractIDQCM: function(ID) {
            var API = this;
            var ret = API.unformatID(ID, 2);
            return ret.ID;
        }
        //TODO : move selftest here
    };
});
