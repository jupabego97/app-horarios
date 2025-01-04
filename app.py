from flask import Flask, render_template, request

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/procesar", methods=["POST"])
def procesar():
    # Obtener las listas de nombres y horas
    nombres = request.form.getlist('nombres[]')
    horas = request.form.getlist('horas[]')
    
    # Crear una lista de diccionarios con los datos de los trabajadores
    trabajadores = []
    for nombre, hora in zip(nombres, horas):
        trabajador = {
            'nombre': nombre,
            'horas': int(hora)
        }
        trabajadores.append(trabajador)
    
    # Aquí puedes hacer lo que necesites con los datos
    # Por ejemplo, imprimir la información:
    for trabajador in trabajadores:
        print(f"Trabajador: {trabajador['nombre']}, Horas: {trabajador['horas']}")
    
    # También puedes pasar los datos a un template
    return render_template('resultado.html', trabajadores=trabajadores)