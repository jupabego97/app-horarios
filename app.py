from flask import Flask, render_template, request
from itertools import combinations

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

def distribuir_horarios(trabajadores):
    horarios = {
        'Lunes': list(range(9, 21)),
        'Martes': list(range(9, 21)),
        'Miércoles': list(range(9, 21)),
        'Jueves': list(range(9, 21)),
        'Viernes': list(range(9, 21)),
        'Sábado': list(range(10, 21)),
        'Domingo': list(range(10, 20))
    }
    
    asignaciones = {dia: {hora: [] for hora in horas} 
                   for dia, horas in horarios.items()}
    
    # Ordenar trabajadores por horas disponibles (mayor a menor)
    trabajadores.sort(key=lambda x: x['horas'], reverse=True)
    
    for trabajador in trabajadores:
        horas_asignadas = 0
        horas_continuas = 0
        ultimo_dia = None
        ultima_hora = None
        
        for dia, horas in horarios.items():
            if horas_asignadas >= trabajador['horas']:
                break
                
            for hora in horas:
                if horas_asignadas >= trabajador['horas']:
                    break
                    
                # Verificar máximo 9 horas por día
                if ultimo_dia == dia:
                    if horas_continuas >= 9:
                        continue
                    if hora != ultima_hora + 1:
                        horas_continuas = 0
                else:
                    horas_continuas = 0
                
                # Verificar si se necesitan más trabajadores en este horario
                trabajadores_actuales = asignaciones[dia][hora]
                if not validar_horario({'hora': hora, 'dia': dia}, 
                                     trabajadores_actuales):
                    asignaciones[dia][hora].append(trabajador['nombre'])
                    horas_asignadas += 1
                    horas_continuas += 1
                    ultimo_dia = dia
                    ultima_hora = hora
    
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