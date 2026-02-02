//printPapaObject accept only construction returned by papaParser (array of objects)
function printPapaObject(papa) {
        var header = "";
        var tbody = "";
        for (var p in papa.meta.fields) {
          header += "<th>" + papa.meta.fields[p] + "</th>";
        }
        for (var i = 0; i < papa.data.length; i++) {
          var row = "";
          for (var z in papa.data[i]) {
            row += "<td>" + papa.data[i][z] + "</td>";
          }
          tbody += "<tr>" + row + "</tr>";
        }
        //build a table
        $("output").html(
          '<table class="table"><thead>' +
            header +
            "</thead><tbody>" +
            tbody +
            "</tbody></table>"
        );
      }

function handleFileSelect(evt) {
  var file = evt.target.files[0];

  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    complete: function(results) {
      console.log(results);
      printPapaObject(results);
    }
  });
}

$(document).ready(function() {
  $("#csv-file").change(handleFileSelect);
});