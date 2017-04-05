'use strict';

/* Services */


angular.module('qcmffvl.services', [])

.factory('API', function($http){
    return {
        // newCatDistrib() returns an array with the categories to be displayed,
        // using the wanted percentage distribution per category, as expressed by
        // baseCatDistrib like : [["L","N","R"], ["E"], ["GH"], ...]
        // (contains 10 items, each one being a category, to express percentage)
        // We add para and delta, because both won't ever show up at the same time
        newCatDistrib: function(baseCatDistrib, randnum) {
            var seed = Math.floor(randnum*10000);
            var mymt = new MersenneTwister(seed);
            var distrib = [];
            for (var i=0; i<baseCatDistrib.length; i++) {
                var item = baseCatDistrib[i];
                // only one category
                if (item.length == 1) {
                    distrib.push(item[0]);
                } else {
                    // choose any item, statistically even.
                    // randomized to avoid, in case of ["L", "NR"]
                    // L N L N L N, where for 30 questions we always get 2 general and 1 specific
                    var choice = Math.floor(mymt.random() * item.length);
                    // item[choice] is a string
                    if (item[choice].length > 1) {
                        for (var j=0; j<item[choice].length; j++) {
                            distrib.push(item[choice][j]);
                        }
                    } else {
                        distrib.push(item[choice][0]); // [0] is optionnal
                    }
                }
            }
            // shuffle distrib, so we have the correct percentage but placement is randomized
            var m = distrib.length;
            var i,t;
            // While there are elements to shuffle...
            while (m) {
                // Pick a remaining element...
                i = Math.floor(mymt.random() * m--);
                // And swap it with the current element.
                t = distrib[m];
                distrib[m] = distrib[i];
                distrib[i] = t;
            }
            // console.log("distribution : " + distrib);
            return distrib;
        },

        generateQCM: function(array, qcmOptions, qcmVer, options, QCMID, answers) {
            var API = this;
            // baseCatDistrib : category distribution (cf newCatDistrib)
            var baseCatDistrib = qcmOptions.catDistrib;
            // corresTable : correspondance table between cat+level and questions indexes
            var corresTable = angular.copy(qcmOptions.corresTable);
            // catFallback : which category to fallback to when one is/becomes empty
            var catFallback = qcmOptions.catFallback;

            // we want to have 10 numbers tops to define the QCM ID,
            // so 2^33, which is 2^32 for the seed, and 1 bit to
            // define if we shall advance in the PRNG
            var seed, surseed;

            // 0 to 2^3X
            var max32 = Math.pow(2,32) -1;
            var max33 = Math.pow(2,33) -1;

            // generate from a known QCM ID
            if (QCMID) {
                if (API.verifyChecksum(QCMID) == -1) {
                    return -1;
                }
                var uncomp = API.uncomputeID(QCMID)
                QCMID = uncomp.num;
                options = uncomp.options;

                seed = QCMID % max32;
                surseed = Math.floor(QCMID / max32);
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

            var resArray = [];
            var endoflevel = [false,false,false];

            while (resArray.length != array.length && (endoflevel[0] == false || endoflevel[1] == false || endoflevel[2] == false)) {
                // category distribution (returns 10 items)
                var catDistrib = API.newCatDistrib(baseCatDistrib, mt.random());
                for (var c = 0; c < catDistrib.length; c++) {
                    var cat = catDistrib[c];
                    for (var level = 0; level <= 2; level++) {
                        // if we are out of questions for the requested level,
                        // fallback to the next level
                        if (endoflevel[level]) {
                            continue;
                        }
                        var cats = [cat];

                        // if we are out of questions for the requested category,
                        // fallback to the first available category, as described by catFallback[]
                        if (corresTable[cat][level].length == 0) {
                            var fc;
                            var found = false;
                            for (var j=0; j<catFallback[cat].length && !found; j++) {
                                fc = catFallback[cat][j];
                                // if 2 categories given
                                if (fc.length > 1) {
                                    for (var k=0; k<fc.length; k++) {
                                        if (corresTable[fc[k]][level].length > 0) {
                                            found = true;
                                        }
                                    }
                                } else if (corresTable[fc][level].length > 0) {
                                    found = true;
                                }
                            }
                            if (found) {
                                cats = fc;
                            } else {
                                endoflevel[level] = true;
                                continue;
                            }
                        }
                        for (var k=0; k<cats.length; k++) {
                            var mycat = cats[k];
                            if (corresTable[mycat][level].length > 0) {
                                var num = Math.floor(mt.random() * corresTable[mycat][level].length);
                                var index = corresTable[mycat][level][num];
                                resArray.push(array[index]);
                                corresTable[mycat][level].splice(num, 1);
                            }
                        }
                    }
                }
            }

            API.untickAnswers(resArray);

            // randomize answers order (per question) with given MT
            for (var i=0; i<resArray.length; i++) {
                var anslen = resArray[i].ans.length;
                for (var j=0; j<anslen; j++) {
                    var rand = Math.floor(mt.random() * anslen);
                    if (rand != j) {
                        var tmp = resArray[i].ans[j];
                        resArray[i].ans[j] = resArray[i].ans[rand];
                        resArray[i].ans[rand] = tmp;
                    }
                }
                // in case answers were set in a previous unfinished session of the same QCM
                // tick them _after_ we are finished ordering properly
                if (answers) {
                    var storedAns = answers[resArray[i].code];
                    if (storedAns) {
                        for (var k=0; k<storedAns.length; k++) {
                            resArray[i].ans[storedAns[k]].checked = true;
                        }
                    }
                }
            }
            // modify original array
            for (var i=0; i<array.length; i++) {
                array[i] = resArray[i];
            }

            // return QCM ID
            return API.computeID(seed + max32 * surseed, qcmVer, options);
        },
        tickAnswers: function(array) {
            if (array) {
                for (var i=0; i<array.length; i++) {
                    for (var j=0; j<array[i].ans.length; j++) {
                        if (array[i].ans[j].pts >= 0) {
                            array[i].ans[j].checked = true;
                        }
                    }
                }
            }
        },
        untickAnswers: function(array) {
            if (array) {
                for (var i=0; i<array.length; i++) {
                    for (var j=0; j<array[i].ans.length; j++) {
                        delete(array[i].ans[j].checked);
                    }
                }
            }
        },
        computeID: function(num, qcmVer, options) {
            var API = this;
            var padnum = API.pad(num, 10);
            var optnum = 0;
            if (options)
                optnum = API.pad(API.computeOptions(options),3);
            var ck = API.pad(API.checksum(num, qcmVer, optnum),3);
            return ck + padnum + qcmVer + optnum;
        },
        uncomputeID: function(ID) {
            var API = this;
            var ck = parseInt(ID.substr(0,3),10);
            var num = parseInt(ID.substr(3,10),10);
            var qcmVer = parseInt(ID.substr(13,2),10);
            var optnum;
            var opt;
            // 3.0 <= Version < 3.2
            if (ID.length == 17) {
                optnum = parseInt(ID.substr(15,2),10);
                // initialise opt[3] to 0 : all categories
                opt = API.uncomputeOptions(optnum * 6);
            // Version >= 3.2
            } else {
                optnum = parseInt(ID.substr(15,3),10);
                opt = API.uncomputeOptions(optnum);
            }
            return { "ck":ck, "options":opt, "num":num, "optnum":optnum, "qcmVer":qcmVer }
        },
        computeOptions: function(opt) {
            var API = this;
            // console.debug("-- computeOptions --");
            // console.debug(opt);

            // sport : 2 options
            // level : 3 options
            // nbquestions : 5 options
            // category : 6 options
            // encode everything into a 2*3*5*6 (= 180) number
            var optnum = opt[0]*3*5*6 + opt[1]*5*6 + opt[2]*6 + opt[3];
            return optnum;
        },
        uncomputeOptions: function(num) {
            // console.debug("-- uncomputeOptions --");
            // console.debug(num);
            var opt = [];
            opt[0] = Math.floor(num/(3*5*6));
            opt[1] = Math.floor((num-opt[0]*3*5*6)/(5*6));
            opt[2] = Math.floor((num-opt[0]*3*5*6-opt[1]*5*6)/6);
            opt[3] = num-opt[0]*3*5*6-opt[1]*5*6-opt[2]*6;
            // console.debug(opt);
            return opt;
        },
        // returns :
        // checksum if none given or if checksum matches "ck"
        // -1 if the one given ("ck") is bogus
        checksum: function(num, qcmVer, optnum, ck) {
            // space 10^3 for parity bits : 2^9 < 10^3 < 2^10 : so 9 parity bits
            var nbits = 9;
            var pbits = [];
            // num is on 10 digits, calculate the checksum for "num" + "qcmVer" + "optnum" (concatenated like strings)
            var b2num = (num+qcmVer*Math.pow(10,10)+optnum*Math.pow(12,10)).toString(2);
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
            if (!ID || ID.length < 17 || ID.length > 18) {
                return false;
            }
            var IDdict = API.uncomputeID(ID);
            return (API.checksum(IDdict.num, IDdict.qcmVer, IDdict.optnum, IDdict.ck) != -1);
        },
        verifyVersion: function(ID, qcmVer) {
            var API = this;
            var IDdict = API.uncomputeID(ID);
            return (IDdict.qcmVer == qcmVer);
        },
        extractVersion: function(ID) {
            var API = this;
            var IDdict = API.uncomputeID(ID);
            return IDdict.qcmVer;
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
