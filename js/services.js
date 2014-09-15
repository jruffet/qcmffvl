'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('qcmffvl.services', [])

.value('version', '0.1')

.factory('API', function($http){
    return {

        newQCM: function(array) {
            var m = array.length, t, i;

            // While there remain elements to shuffle…
            while (m) {
                // Pick a remaining element…
                i = Math.floor(Math.random() * m--);

                // And swap it with the current element.
                t = array[m];
                array[m] = array[i];
                array[i] = t;
            }

            // clean previous answers
            for (var i=0; i<array.length; i++) {
                for (var j=0; j<array[i].ans.length; j++) {
                    delete(array[i].ans[j].checked);
                }
            }
            return array;
        },
        loadQCM: function() {
            var API = this;
            var result = { content:null };
            $http.get('http://qcmffvl.sativouf.net/json/qcm.json')
            .then(function(res){
                result.content = API.shuffle(res.data);
            });
            return result;
        }
    };
});
