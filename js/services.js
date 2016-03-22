'use strict';

/* Services */


angular.module('qcmffvl.services', [])

.value('version', '1.3')

.factory('API', function($http){
    return {
        generateQCM: function(array, options, QCMID) {
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
                if (API.verifyChecksum(QCMID) == -1) {
                    return -1;
                }
                var uncomp = API.uncomputeID(QCMID)
                QCMID = uncomp.num;
                options = uncomp.options;

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
            return API.computeID(seed + max32 * surseed, options);
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
        computeID: function(num, options) {
            var API = this;
            var padnum = API.pad(num, 10);
            var optnum = API.pad(API.computeOptions(options),2);
            var ck = API.pad(API.checksum(num, optnum),3);

            return ck + padnum + optnum;
        },
        uncomputeID: function(ID) {
            var API = this;
            var ck = parseInt(ID.substr(0,3),10);
            var num = parseInt(ID.substr(3,10),10);
            var optnum = parseInt(ID.substr(13,2),10);
            var opt = API.uncomputeOptions(optnum);
            return { "ck":ck, "options":opt, "num":num, "optnum":optnum }
        },
        computeOptions: function(opt) {
            var API = this;
            // console.debug("-- computeOptions --");
            // console.debug(opt);

            // category : 2 options
            // level : 3 options
            // nbquestions : 5 options
            // encode everything into a 2*3*5 number
            var optnum = opt[0]*3*5 + opt[1]*5 + opt[2];
            return optnum;
        },
        uncomputeOptions: function(num) {
            var opt = [];
            opt[0] = Math.floor(num/(3*5)); 
            opt[1] = Math.floor((num-opt[0]*3*5)/5);
            opt[2] = num-opt[0]*3*5-opt[1]*5; 
            return opt;
        },
        // returns :
        // checksum if none given
        // -1 if the one given is bogus
        checksum: function(num, optnum, ck) {
            // space 10^3 for parity bits : 2^9 < 10^3 < 2^10 : so 9 parity bits
            var nbits = 9;
            var pbits = [];
            // num is on 10 digits, calculate the checksum for optnum + num (if they were strings)
            var b2num = (num+optnum*Math.pow(10,10)).toString(2);
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
                return -1;
            }
            return csum;
        },
        verifyChecksum: function(ID) {
            var API = this;
            if (!ID || ID.length != 15) {
                return false;
            }
            var IDdict = API.uncomputeID(ID);
            return (API.checksum(IDdict.num, IDdict.optnum, IDdict.ck) != -1);
        },
        pad: function(num, size) {
            return ('00000000000000000000000' + num).substr(-size);
        },
        crc: function(txt) {
            return crc32(txt).toUpperCase();
        }

        //TODO : move selftest here
    };
});
