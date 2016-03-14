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
                QCMID = API.unformatNumber(QCMID);
                seed = QCMID % max32;
                surseed = Math.floor(QCMID / max32);
                // console.debug(seed);
                // console.debug(surseed);
            } else {
                // generate random value between 0 and 2^32 - 1
                seed = Math.floor(Math.random() * (max32 + 1));
                surseed = Math.floor(Math.random() * (1+1));
                // console.debug(seed);
                // console.debug(surseed);

            }
            var mt = new MersenneTwister(seed);
            if (surseed) {
                // skip 1000 numbers in the PRNG, which is supposedly more than
                // we will ever have questions
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
            QCMID = seed + max32 * surseed;
            return API.formatNumber(QCMID);
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
        formatNumber: function(num) {
            return num.toString().replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
        },
        unformatNumber: function(num) {
            return parseInt(num.replace(/ /g, ''));
        }
        //TODO : move selftest here
        // testUnicity: function() {
        //     var API = this;
        //     var max32 = Math.pow(2,32) -1;
        //     var test_array = [];

        //     array = API.genTestQCM();
        //     test_array = angular.copy(array);
        //     for (var i=0; i<max32; i++) {
        //         test_array = angular.copy(array);
        //         API.generateQCM(test_array);
        //     }
        // },
        // genTestQCM: function() {
        //     var size = 600;
        //     var array = [];
        //     for(var i = 1; i <= size ; i++) {
        //         var obj = { question : i , ans : "x", shown : 0 };
        //         array.push(obj);
        //     }
        //     return array;
        // }
    };
});
