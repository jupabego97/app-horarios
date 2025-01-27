from flask import Flask, render_template, request

app = Flask(__name__)

def validar_horario(horario, trabajadores_asignados):
    hora = int(horario['hora'])
    dia = horario['dia']
    
    # Regla 1: De 9 a 10 L-V solo necesita 1 trabajador
    if hora == 9 and dia in ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']:
        return len(trabajadores_asignados) >= 1
    
    # Regla 2: De 12 a 14 necesita 3 trabajadores
    if 12 <= hora < 14:
        return len(trabajadores_asignados) >= 3
    
    # Regla 3: De 17 a 19 necesita 3 trabajadores (excepto domingo)
    if 17 <= hora < 19:
        if dia == 'Domingo':
            return len(trabajadores_asignados) >= 2
        return len(trabajadores_asignados) >= 3
    
    # Regla por defecto: 2 trabajadores
    return len(trabajadores_asignados) >= 2

def encontrar_bloque_mas_largo(dia, asignaciones, trabajador, horarios):
    horas_dia = horarios[dia]
    max_longitud = 0
    inicio_max = None
    fin_max = None

    current_inicio = None
    current_longitud = 0

    for hora in horas_dia:
        if (not validar_horario({'hora': hora, 'dia': dia}, asignaciones[dia][hora]) and
            trabajador['nombre'] not in asignaciones[dia][hora]):
            if current_inicio is None:
                current_inicio = hora
            current_longitud += 1
        else:
            if current_longitud > max_longitud:
                max_longitud = current_longitud
                inicio_max = current_inicio
                fin_max = hora - 1 if current_inicio is not None else None
            current_inicio = None
            current_longitud = 0

    if current_longitud > max_longitud:
        max_longitud = current_longitud
        inicio_max = current_inicio
        fin_max = horas_dia[-1] if current_inicio is not None else None

    return (inicio_max, fin_max, max_longitud)

def distribuir_horarios(trabajadores):
    horarios = {
        'Lunes': list(range(9, 20)),
        'Martes': list(range(9, 20)),
        'Miércoles': list(range(9, 20)),
        'Jueves': list(range(9, 20)),
        'Viernes': list(range(9, 20)),
        'Sábado': list(range(10, 20)),
        'Domingo': list(range(10, 19))
    }
    
    asignaciones = {dia: {hora: [] for hora in horas} 
                   for dia, horas in horarios.items()}
    
    trabajadores.sort(key=lambda x: x['horas'], reverse=True)
    
    for trabajador in trabajadores:
        horas_asignadas = 0
        
        while horas_asignadas < trabajador['horas']:
            mejor_dia = None
            mejor_inicio = None
            mejor_fin = None
            mejor_longitud = 0
            
            for dia in horarios:
                horas_en_dia = sum(1 for hora in horarios[dia] if trabajador['nombre'] in asignaciones[dia][hora])
                if horas_en_dia >= 9:
                    continue
                
                inicio, fin, longitud = encontrar_bloque_mas_largo(dia, asignaciones, trabajador, horarios)
                if longitud == 0:
                    continue
                
                max_possible = min(
                    longitud,
                    9 - horas_en_dia,
                    trabajador['horas'] - horas_asignadas
                )
                
                if max_possible > mejor_longitud:
                    mejor_longitud = max_possible
                    mejor_dia = dia
                    mejor_inicio = inicio
                    mejor_fin = inicio + max_possible - 1 if inicio is not None else None
            
            if mejor_dia is None:
                break
            
            if mejor_inicio is not None and mejor_fin is not None:
                for hora in range(mejor_inicio, mejor_fin + 1):
                    if hora not in asignaciones[mejor_dia]:
                        continue
                    if trabajador['nombre'] not in asignaciones[mejor_dia][hora]:
                        asignaciones[mejor_dia][hora].append(trabajador['nombre'])
                        horas_asignadas += 1
                        if horas_asignadas >= trabajador['horas']:
                            break
    
    return asignaciones

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/procesar", methods=["POST"])
def procesar():
    nombres = request.form.getlist('nombres[]')
    horas = request.form.getlist('horas[]')
    
    trabajadores = [
        {'nombre': nombre, 'horas': int(hora)}
        for nombre, hora in zip(nombres, horas)
    ]
    
    asignaciones = distribuir_horarios(trabajadores)
    
    return render_template('resultado.html', 
                         asignaciones=asignaciones, 
                         trabajadores=trabajadores)

if __name__ == "__main__":
    app.run(debug=True)